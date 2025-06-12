// Temporary authentication fix to prevent redirect loops
window.authCheckInProgress = false;

// Override the authentication check to prevent loops
const originalCheckAuth = window.checkAuthentication;
window.checkAuthentication = function() {
    if (window.authCheckInProgress) {
        console.log('Auth check already in progress, skipping to prevent loop');
        return;
    }
    
    window.authCheckInProgress = true;
    
    setTimeout(() => {
        window.authCheckInProgress = false;
    }, 5000);
    
    // Only proceed if we haven't been redirected recently
    const lastRedirect = localStorage.getItem('lastAuthRedirect');
    const now = Date.now();
    
    if (lastRedirect && (now - parseInt(lastRedirect)) < 10000) {
        console.log('Recent redirect detected, skipping auth check');
        window.authCheckInProgress = false;
        return;
    }
    
    if (originalCheckAuth) {
        originalCheckAuth();
    }
};