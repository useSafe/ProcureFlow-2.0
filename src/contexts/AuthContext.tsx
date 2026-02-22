import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types/procurement';
import { getStoredUser, setStoredUser } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {


      // 2. Check Local Storage
      const storedUser = getStoredUser();

      if (storedUser) {
        // Optional: Validate stored user against DB to check if role changed or deactivated
        // For now, trust local storage for speed, or re-verify
        // Let's re-verify to ensure inactive users are booted
        const usersRef = ref(db, `users/${storedUser.id}`);
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const freshUser = snapshot.val() as User;
          if (freshUser.status === 'active') {
            setUser(freshUser);
            setStoredUser(freshUser);
          } else {
            setStoredUser(null);
            setUser(null);
          }
        } else {
          // User deleted
          setStoredUser(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate inputs
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Check registered users in Firebase
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val();
        const foundUser = Object.values(users).find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase()
        ) as User | undefined;

        if (foundUser) {
          // Check Status
          if (foundUser.status === 'inactive') {
            return { success: false, error: 'Account is inactive. Please contact administrator.' };
          }

          // Verify password (Plain text comparison as requested for "Visible Password" feature)
          // If legacy passwordHash exists and no password field, handling that would be complex, 
          // but we assume new system or Seeded Admin uses 'password' field.

          if (foundUser.password === password) {
            // Login success
            setUser(foundUser);
            setStoredUser(foundUser);

            return { success: true };
          }

          // Legacy Hash check (Optional fall back if needed, but likely not for this specific request)
          // For simplicty and meeting the "Visible Password" requirement, we stick to plain text.
        }
      }

      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setStoredUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
