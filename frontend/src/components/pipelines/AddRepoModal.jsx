// ═══════════════════════════════════════════════════════════════════════════════
// src/components/pipelines/AddRepoModal.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'

export function AddRepoModal({ open, onClose, onAdd }) {
    const [repoUrl, setRepoUrl] = useState('')
    const [adding, setAdding] = useState(false)
    const [err, setErr] = useState(null)

    const reset = () => { setRepoUrl(''); setErr(null) }

    const handleClose = () => { reset(); onClose() }

    const handleAdd = async () => {
        if (!repoUrl.trim()) return
        setAdding(true); setErr(null)
        try {
            await onAdd(repoUrl.trim())
            reset(); onClose()
        } catch (e) {
            setErr(e.response?.data?.message ?? 'Could not add repository. Check the URL and try again.')
        } finally { setAdding(false) }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Add GitHub Repository"
            footer={
                <>
                    <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleAdd} disabled={adding || !repoUrl.trim()}>
                        {adding ? <><Spinner size="sm" /> Adding…</> : <><Plus size={14} /> Add Repository</>}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {err && <ErrorBanner message={err} />}

                <div>
                    <label className="label">GitHub repository URL or owner/name</label>
                    <input
                        className="input"
                        placeholder="owner/repo  or  https://github.com/owner/repo"
                        value={repoUrl}
                        onChange={e => setRepoUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        autoFocus
                    />
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                    <AlertCircle size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-brand-700 dark:text-brand-300 space-y-1">
                        <p className="font-semibold">Access requirements</p>
                        <p>Public repos work immediately. Private repos require the <code className="font-mono bg-brand-100 dark:bg-brand-800 px-1 rounded">repo</code> scope on your GitHub OAuth token.</p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}