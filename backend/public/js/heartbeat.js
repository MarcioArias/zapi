(function() {
    // Only active in Desktop Mode (checked via API or implied by local usage)
    // We'll send a heartbeat every 5 seconds.
    
    const sendHeartbeat = async () => {
        try {
            await fetch('/api/heartbeat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true // Important for when tab is closing
            });
        } catch (e) {
            // Ignore errors (server might be down or starting)
        }
    };

    // Check if we are likely on desktop (localhost or 127.0.0.1)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
        setInterval(sendHeartbeat, 5000);
        sendHeartbeat(); // Initial beat
    }
})();