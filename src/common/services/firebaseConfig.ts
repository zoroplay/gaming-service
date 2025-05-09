/* eslint-disable prettier/prettier */
import { ServiceAccount } from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const { privateKey } = JSON.parse(process.env.FIREBASE_PRIVATE_KEY)
// const privateKey  = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')

 export const firebaseServiceAccount = {
  'type': process.env.FIREBASE_PROJECT_TYPE,
  'project_id':  process.env.FIREBASE_PROJECT_ID,
  'private_key_id': process.env.FIREBASE_PRIVATE_KEY_ID,
  'private_key': privateKey.replace(/\\n/g, '\n'),
  'client_email': process.env.FIREBASE_CLIENT_EMAIL,
  'client_id': process.env.FIREBASE_CLIENT_ID,
  'auth_uri': process.env.FIREBASE_AUTH_URL,
  'token_uri': process.env.FIREBASE_TOKEN_URL,
  'auth_provider_x509_cert_url': process.env.FIREBASE_AUTH_PROVIDER,
  'client_x509_cert_url': process.env.FIREBASE_CLIENT_URL,
  'universe_domain': process.env.FIREBASE_DOMAIN

} as ServiceAccount;




