class AuthManager {
    constructor(firebaseAdapter) {
        if (!firebaseAdapter || typeof firebaseAdapter.onAuthStateChanged !== 'function') {
            throw new Error("AuthManager requires a FirebaseAdapter with onAuthStateChanged method.");
        }
        this.firebaseAdapter = firebaseAdapter;
        this.currentUser = null;
        this.authCheckComplete = false; // Flag to know when initial check is done
        this.onStateChangeCallbacks = []; // Store callbacks for UI updates

        // Bind methods
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
        this.signIn = this.signIn.bind(this);
        this.signOut = this.signOut.bind(this);
        this.onAuthStateUpdate = this.onAuthStateUpdate.bind(this);
    }

    initialize() {
        console.log("Initializing AuthManager...");
        // Start listening to auth state changes immediately
        this.firebaseAdapter.onAuthStateChanged(this.handleAuthStateChange);
    }

    handleAuthStateChange(user) {
        console.log("Auth state changed. User:", user ? user.email : 'Logged out');
        this.currentUser = user;
        this.authCheckComplete = true; // Mark initial check as done

        // Notify all registered callbacks about the state change
        this.onStateChangeCallbacks.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error("Error in auth state change callback:", error);
            }
        });
    }

    /**
     * Registers a callback function to be called whenever the auth state changes.
     * @param {function} callback - The function to call (receives user object or null).
     */
    onAuthStateUpdate(callback) {
        if (typeof callback === 'function') {
            this.onStateChangeCallbacks.push(callback);
            // Immediately call back with current state if initial check is done
            if (this.authCheckComplete) {
                 try {
                    callback(this.currentUser);
                 } catch (error) {
                     console.error("Error in immediate auth state update callback:", error);
                 }
            }
        } else {
            console.warn("AuthManager: Attempted to register a non-function callback.");
        }
    }

    /**
     * Attempts to sign in a user.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import("firebase/auth").User>} The signed-in user object.
     */
    async signIn(email, password) {
        // The adapter handles the actual sign-in and the onAuthStateChanged listener
        // will update the state. We just call the adapter's method.
        try {
            const userCredential = await this.firebaseAdapter.signIn(email, password);
            // State update is handled by the listener, but we return the user
            return userCredential.user;
        } catch (error) {
            console.error("AuthManager signIn failed:", error.message);
            throw error; // Re-throw the error (already user-friendly from adapter)
        }
    }

    /**
     * Attempts to sign out the current user.
     * @returns {Promise<void>}
     */
    async signOut() {
        // Adapter handles sign-out, listener handles state update.
        try {
            await this.firebaseAdapter.signOutUser();
        } catch (error) {
            console.error("AuthManager signOut failed:", error.message);
            throw error; // Re-throw
        }
    }

    /**
     * Checks if a user is currently logged in.
     * @returns {boolean} True if a user is logged in, false otherwise.
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * Gets the current user object.
     * @returns {import("firebase/auth").User | null} The current user or null.
     */
    getCurrentUser() {
        return this.currentUser;
    }

     /**
      * Gets the email of the current user.
      * @returns {string | null} The current user's email or null.
      */
     getCurrentUserEmail() {
         return this.currentUser ? this.currentUser.email : null;
     }

    /**
     * Returns a promise that resolves when the initial auth state check is complete.
     * Useful for delaying actions until we know if the user is logged in or not on page load.
     * @returns {Promise<void>}
     */
    waitForAuthInit() {
        return new Promise((resolve) => {
            if (this.authCheckComplete) {
                resolve();
            } else {
                // Add a temporary callback that resolves the promise
                const tempCallback = () => {
                    resolve();
                    // Remove this specific callback after it runs once
                    this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(cb => cb !== tempCallback);
                };
                this.onStateChangeCallbacks.push(tempCallback);
            }
        });
    }

    // TODO: Add role checking logic here later if needed
    // async getUserRole() { ... }
    // isAdmin() { ... }
}

export { AuthManager };