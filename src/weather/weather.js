const WEATHER_MAP = {
  0: "Clear",
  1: "MostlyClear",
  2: "PartlyCloudy",
  3: "Overcast",
  45: "Fog",
  48: "FreezingFog",
  51: "LightDrizzle",
  53: "Drizzle",
  55: "HeavyDrizzle",
  61: "LightRain",
  63: "Rain",
  65: "HeavyRain",
  71: "LightSnow",
  73: "Snow",
  75: "HeavySnow",
  80: "RainShowers",
  81: "HeavyShowers",
  82: "ViolentRain",
  95: "Thunderstorm",
  99: "ThunderstormHail",
};

/**
 * @typedef {keyof typeof WEATHER_MAP} WeatherState
 * @typedef {Object} WeatherInfo
 * @property {string} location - City name (approximate)
 * @property {WeatherState} condition - Simplified weather condition
 * @property {number|null} temperature - Degrees Celsius
 */

/**
 * Fetch current weather using IP-based lookup.
 * Returns a simplified object with condition + temperature.
 * @returns {Promise<WeatherInfo>}
 */
async function getCurrentWeather() {
  try {
    const ipRes = await fetch("https://ipapi.co/json/");
    const ipData = await ipRes.json();

    if (!ipData || !ipData.latitude || !ipData.longitude)
      throw new Error("IP lookup failed");

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${ipData.latitude}&longitude=${ipData.longitude}&current_weather=true`,
    );
    const weatherData = await weatherRes.json();

    const code = weatherData?.current_weather?.weathercode;
    const mapped = WEATHER_MAP[code] || "Unknown";

    return {
      location: ipData.city || "Unknown",
      condition: mapped,
      temperature: weatherData?.current_weather?.temperature ?? null,
    };
  } catch (err) {
    console.error("[Weather] Failed to fetch:", err.message);
    return { location: "Unknown", condition: "Unknown", temperature: null };
  }
}

export { getCurrentWeather, WEATHER_MAP };
