import {appBridge, appSchema} from '../App';

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;
export type AppPostMessageSchema = typeof appSchema;
