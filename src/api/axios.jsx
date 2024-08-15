import axios from 'axios';

export const axiosPrivate = axios.create({
  baseURL: import.meta.env.VITE_URL_LOC,
  withCredentials: true,
});
