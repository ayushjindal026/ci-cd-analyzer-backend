import {
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'

import Layout from '@/components/layout/Layout'

import Dashboard from '@/pages/Dashboard'
import Pipelines from '@/pages/Pipelines'
import Runs from '@/pages/Runs'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'

import Login from '@/pages/Login'
import OAuthSuccess from '@/pages/OAuthSuccess'

import ProtectedRoute from '@/router/ProtectedRoute'

export default function AppRoutes() {

    return (

        <Routes>

            {/* ───────────────────────────────────────── */}
            {/* PUBLIC ROUTES */}
            {/* ───────────────────────────────────────── */}

            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/oauth-success"
                element={<OAuthSuccess />}
            />

            {/* ───────────────────────────────────────── */}
            {/* PROTECTED APP ROUTES */}
            {/* ───────────────────────────────────────── */}

            <Route
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >

                <Route
                    path="/"
                    element={<Dashboard />}
                />

                <Route
                    path="/repos"
                    element={<Pipelines />}
                />

                <Route
                    path="/runs"
                    element={<Runs />}
                />

                <Route
                    path="/insights"
                    element={<Insights />}
                />

                <Route
                    path="/settings"
                    element={<Settings />}
                />

            </Route>

            {/* ───────────────────────────────────────── */}
            {/* FALLBACK */}
            {/* ───────────────────────────────────────── */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />

        </Routes>
    )
}