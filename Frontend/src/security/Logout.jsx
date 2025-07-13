import axios from 'axios';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextProvider } from '../contexts/AppContext';
async function Logout() {
  const { setIsAuth } = useContext(ContextProvider);
  const navigate = useNavigate();
    try {
      await axios.post('http://localhost:5000/api/user/logout', {}, {
        withCredentials: true,
      });
      
      localStorage.removeItem("user-threads");
      sessionStorage.clear();
      setIsAuth(false);
      
      toast.success('Logged out successfully');
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error(error.response?.data?.message || 'Logout failed. Please try again.');
    }
};
export default Logout