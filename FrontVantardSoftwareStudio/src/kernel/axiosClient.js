import axios from 'axios';

import { ENV } from '../config/env.js';

export const axiosClient = axios.create({
  baseURL: ENV.API_URL,
});
