import dotenv from 'dotenv';
dotenv.config();

export type Config = {
  LLM_PROVIDER: string;
  FOURSQUARE_API_KEY: string;
  MAPBOX_TOKEN: string;
  OPENAI_API_KEY?: string;
  PORT: number;
};

export const config: Config = {
  LLM_PROVIDER: process.env.LLM_PROVIDER || '',
  FOURSQUARE_API_KEY: process.env.FOURSQUARE_API_KEY || '',
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PORT: Number(process.env.PORT) || 3001,
};
