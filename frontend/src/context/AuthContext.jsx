import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = async (updates) => {
    try {
      const response = await api.patch('/users/me', updates);
      setUserProfile(response.data);
      return { success: true };
    } catch (err) {
      console.error('Failed to update profile:', err);
      return { success: false, error: err.response?.data?.detail || 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ userProfile, isLoading, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
