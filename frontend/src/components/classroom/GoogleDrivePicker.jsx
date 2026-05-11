import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaGoogleDrive } from 'react-icons/fa';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_DRIVE_APP_ID;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const GoogleDrivePicker = ({ isOpen, onClose, onSelect, multiSelect = false }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const gapiLoaded = useRef(false);
    const gisLoaded = useRef(false);
    const tokenClient = useRef(null);
    const accessToken = useRef(null);

    // Load Scripts
    useEffect(() => {
        const loadScripts = async () => {
            if (window.gapi && window.google) {
                gapiLoaded.current = true;
                gisLoaded.current = true;
                return;
            }

            const script1 = document.createElement('script');
            script1.src = "https://apis.google.com/js/api.js";
            script1.async = true;
            script1.defer = true;
            script1.onload = () => {
                window.gapi.load('picker', () => {
                    gapiLoaded.current = true;
                });
            };
            document.body.appendChild(script1);

            const script2 = document.createElement('script');
            script2.src = "https://accounts.google.com/gsi/client";
            script2.async = true;
            script2.defer = true;
            script2.onload = () => {
                gisLoaded.current = true;
            };
            document.body.appendChild(script2);
        };

        loadScripts();
    }, []);

    const createPicker = useCallback((token) => {
        if (!window.google) return;

        const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
        view.setMimeTypes('application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        
        const picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setAppId(GOOGLE_APP_ID)
            .setOAuthToken(token)
            .addView(view)
            .addView(new window.google.picker.DocsUploadView())
            .setDeveloperKey(GOOGLE_API_KEY)
            .setCallback((data) => {
                if (data.action === window.google.picker.Action.PICKED) {
                    const files = data.docs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        url: doc.url,
                        mimeType: doc.mimeType,
                        iconUrl: doc.iconUrl,
                        embedUrl: doc.embedUrl
                    }));
                    onSelect(files);
                    onClose();
                } else if (data.action === window.google.picker.Action.CANCEL) {
                    onClose();
                }
            })
            .build();
        picker.setVisible(true);
    }, [onSelect, onClose]);

    const handleAuth = useCallback(() => {
        if (!gapiLoaded.current || !gisLoaded.current) {
            alert("Google services are still loading. Please wait a moment.");
            onClose();
            return;
        }

        if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_APP_ID) {
            console.error("Missing Google Drive credentials in environment variables.");
            alert("Google Drive integration is not configured. Please add VITE_GOOGLE_DRIVE_API_KEY, VITE_GOOGLE_DRIVE_CLIENT_ID, and VITE_GOOGLE_DRIVE_APP_ID to your .env file.");
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: async (response) => {
                    if (response.error !== undefined) {
                        console.error("Auth error:", response.error);
                        setIsLoading(false);
                        onClose();
                        return;
                    }
                    accessToken.current = response.access_token;
                    createPicker(response.access_token);
                    setIsLoading(false);
                },
            });

            tokenClient.current.requestAccessToken({ prompt: accessToken.current ? '' : 'consent' });
        } catch (err) {
            console.error("Error initializing Google Auth:", err);
            setIsLoading(false);
            onClose();
        }
    }, [createPicker, onClose]);

    useEffect(() => {
        if (isOpen) {
            handleAuth();
        }
    }, [isOpen, handleAuth]);

    return null; // Headless component
};

export default GoogleDrivePicker;
