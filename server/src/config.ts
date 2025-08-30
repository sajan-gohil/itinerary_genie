import dotenv from 'dotenv';
dotenv.config();

export type Config = {
  LLM_PROVIDER: string;
  FOURSQUARE_API_KEY: string;
  FOURSQUARE_API_VERSION: string;
  MAPBOX_TOKEN: string;
  OPENAI_API_KEY?: string;
  PORT: number;
  ORS_TOKEN?: string;
  GOOGLE_MAPS_API_KEY?: string;
};

export const config: Config = {
  LLM_PROVIDER: process.env.LLM_PROVIDER || '',
  FOURSQUARE_API_KEY: process.env.FOURSQUARE_API_KEY || '',
  FOURSQUARE_API_VERSION: process.env.FOURSQUARE_API_VERSION || '2025-06-17',
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PORT: Number(process.env.PORT) || 3001,
  ORS_TOKEN: process.env.ORS_TOKEN || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
};

console.log('Configuration:');
console.log('  LLM_PROVIDER:', config.LLM_PROVIDER );
const mask = (v?: string) => (v ? v.slice(0, 4) + '...' + v.slice(-4) : '[not set]');
console.log('  FOURSQUARE_API_KEY:', mask(config.FOURSQUARE_API_KEY));
console.log('  FOURSQUARE_API_VERSION:', config.FOURSQUARE_API_VERSION);
console.log('  MAPBOX_TOKEN:', mask(config.MAPBOX_TOKEN));
console.log('  OPENAI_API_KEY:', mask(config.OPENAI_API_KEY));
console.log('  PORT:', config.PORT);
console.log('  ORS_TOKEN:', config.ORS_TOKEN || '[not set]');
