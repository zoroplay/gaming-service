/* eslint-disable prettier/prettier */
import { ServiceAccount} from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();



 export const firebaseServiceAccount = {
  'type': process.env.FIREBASE_PROJECT_TYPE,
  'project_id':  process.env.FIREBASE_PROJECT_ID,
  'private_key_id': process.env.FIREBASE_PRIVATE_KEY_ID,
  'private_key': process.env.FIREBASE_PRIVATE_KEY,
  'client_email': process.env.FIREBASE_CLIENT_EMAIL,
  'client_id': process.env.FIREBASE_CLIENT_ID,
  'auth_uri': process.env.FIREBASE_AUTH_URL,
  'token_uri': process.env.FIREBASE_TOKEN_URL,
  'auth_provider_x509_cert_url': process.env.FIREBASE_AUTH_PROVIDER,
  'client_x509_cert_url': process.env.FIREBASE_CLIENT_URL,
  'universe_domain': process.env.FIREBASE_DOMAIN
} as ServiceAccount;


