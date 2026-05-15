import axios from "axios";

const api = axios.create({ baseURL: 'http://localhost:5003' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
});

api.interceptors.response.use(
    (response)=>  {
        return response;
    },
    (error) => {
        console.log(error);
        return Promise.reject(error);
    }
)

export default api;