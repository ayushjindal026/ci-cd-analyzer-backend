// src/hooks/usePipelineSocket.js
//
// Usage:
//   const { connected, lastEvent, events } = usePipelineSocket(repoId);
//
// Dependencies:
//   npm install @stomp/stompjs sockjs-client

import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8081/stomp';
const MAX_EVENTS = 50; // keep last 50 events in memory

/**
 * Subscribes to /topic/repository/{repoId} over STOMP/SockJS.
 *
 * @param {number|string|null} repoId - The monitored repository ID.
 *        Pass null/undefined to skip connecting.
 * @returns {{ connected: boolean, lastEvent: object|null, events: object[], clearEvents: fn }}
 */
export function usePipelineSocket(repoId) {
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const clientRef = useRef(null);

    const clearEvents = useCallback(() => setEvents([]), []);

    useEffect(() => {
        if (!repoId) return;

        const token = localStorage.getItem('piq_access_token'); // adjust to your auth store

        const client = new Client({
            // SockJS factory — provides fallback for browsers without native WS
            webSocketFactory: () => new SockJS(WS_URL),

            // STOMP CONNECT headers — JWT auth
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

            // Reconnect automatically every 5 s
            reconnectDelay: 5000,

            debug: (msg) => {
                if (import.meta.env.DEV) console.debug('[STOMP]', msg);
            },

            onConnect: () => {
                setConnected(true);
                console.info(`[WS] Connected — subscribing to repo ${repoId}`);

                client.subscribe(`/topic/repository/${repoId}`, (message) => {
                    try {
                        const event = JSON.parse(message.body);
                        setLastEvent(event);
                        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
                    } catch (err) {
                        console.error('[WS] Failed to parse event:', err);
                    }
                });
            },

            onDisconnect: () => {
                setConnected(false);
                console.info('[WS] Disconnected');
            },

            onStompError: (frame) => {
                console.error('[WS] STOMP error:', frame.headers?.message, frame.body);
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            client.deactivate();
            clientRef.current = null;
            setConnected(false);
        };
    }, [repoId]);

    return { connected, lastEvent, events, clearEvents };
}