// ═══════════════════════════════════════════════════════════════════════════════
// PATH: frontend/src/hooks/useAiInsights.js
// ═══════════════════════════════════════════════════════════════════════════════

import {
  useState,
  useEffect,
  useCallback,
} from 'react'

import {
  repoApi,
  runApi,
  aiApi,
} from '@/api/client'

/**
 * Loads AI insights for repositories.
 *
 * Flow:
 * 1. Fetch repositories
 * 2. Find latest failed run
 * 3. Fetch AI analysis for that run
 * 4. Combine into dashboard-friendly insight object
 */
export function useAiInsights(repositoryId) {

  const [insights, setInsights] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState(null)

  const load = useCallback(async () => {

    setLoading(true)

    setError(null)

    try {

      // ----------------------------------------------------------------------
      // Repository source
      // ----------------------------------------------------------------------

      const reposResponse = repositoryId

        ? {
          data: [
            {
              id: repositoryId,
            },
          ],
        }

        : await repoApi.list()

      // ----------------------------------------------------------------------
      // Backend currently returns raw arrays
      // NOT ApiResponse wrappers
      // ----------------------------------------------------------------------

      const repositories = Array.isArray(
        reposResponse.data
      )

        ? reposResponse.data

        : reposResponse.data?.content ?? []

      // ----------------------------------------------------------------------
      // No repositories
      // ----------------------------------------------------------------------

      if (!repositories.length) {

        setInsights([])

        return
      }

      // ----------------------------------------------------------------------
      // Fetch insights
      // ----------------------------------------------------------------------

      const results =
        await Promise.allSettled(

          repositories
            .slice(0, 5)
            .map(async (repository) => {

              // --------------------------------------------------------------
              // Latest runs
              // --------------------------------------------------------------

              const runsResponse =
                await runApi.repoRuns(
                  repository.id,
                  {
                    size: 10,
                  }
                )

              const runs = Array.isArray(
                runsResponse.data
              )

                ? runsResponse.data

                : runsResponse.data?.content ?? []

              // --------------------------------------------------------------
              // Find latest failed run
              // --------------------------------------------------------------

              const failedRun =
                runs.find((run) =>

                  [
                    'FAILED',
                    'failed',
                    'failure',
                  ].includes(run.status)
                )

              if (!failedRun) {
                return null
              }

              // --------------------------------------------------------------
              // Existing AI analysis
              // --------------------------------------------------------------

              const analysisResponse =
                await aiApi
                  .getAnalysis(
                    repository.id,
                    failedRun.id
                  )
                  .catch(() => ({
                    data: null,
                  }))

              // --------------------------------------------------------------
              // Analysis not available yet
              // --------------------------------------------------------------

              if (!analysisResponse.data) {
                return null
              }

              // --------------------------------------------------------------
              // Final insight object
              // --------------------------------------------------------------

              return {

                repositoryId:
                  repository.id,

                repositoryName:
                  repository.fullName
                  ?? repository.name,

                runId:
                  failedRun.id,

                buildNumber:
                  failedRun.buildNumber
                  ?? failedRun.id,

                branch:
                  failedRun.branch
                  ?? 'main',

                ...analysisResponse.data,
              }
            })
        )

      // ----------------------------------------------------------------------
      // Filter fulfilled results
      // ----------------------------------------------------------------------

      const validInsights = results

        .filter(
          (result) =>

            result.status === 'fulfilled'
            && result.value
        )

        .map(
          (result) => result.value
        )

      setInsights(validInsights)

    } catch (e) {

      setError(

        e?.response?.data?.message

        ?? 'Failed to load AI insights'
      )

    } finally {

      setLoading(false)
    }

  }, [repositoryId])

  // --------------------------------------------------------------------------
  // Initial load
  // --------------------------------------------------------------------------

  useEffect(() => {

    load()

  }, [load])

  // --------------------------------------------------------------------------
  // Trigger analysis manually
  // --------------------------------------------------------------------------

  const triggerAnalysis = async (
    repositoryId,
    runId
  ) => {

    await aiApi.trigger(
      repositoryId,
      runId
    )

    // Small delay so backend can persist analysis
    setTimeout(() => {

      load()

    }, 2000)
  }

  return {

    insights,

    loading,

    error,

    refetch: load,

    triggerAnalysis,
  }
}