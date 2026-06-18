import api from "./api";

const ForecastService = {
  getForecast: async () => {
    const response = await api.get(
      "/forecast/"
    );

    return response.data;
  },
};

export default ForecastService;