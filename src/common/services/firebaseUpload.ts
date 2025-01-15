/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseServiceAccount } from './firebaseConfig';



@Injectable()
export class FirebaseService {
  private bucket;

  constructor() {
    const storageApp =
      admin.apps.find((app) => app && app.name === 'storageApp') ||
      admin.initializeApp(
        {
          credential: admin.credential.cert(firebaseServiceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET as string,
        },
        'storageApp',
      );

    this.bucket = storageApp.storage().bucket();
  }



async uploadFileToFirebase(
  folderName: string,
  fileName: string,
  localFilePath: string,
): Promise<string> {
  const destinationPath = `${folderName}/${fileName}`;
  try {

    const buffer = Buffer.from(localFilePath, 'base64');
    console.log("buffer", buffer);

    const file = this.bucket.file(destinationPath);
      await file.save(buffer, {
        metadata: {
          contentType: 'image/*', // Set the appropriate content type
        },
      });

      console.log(`Uploaded file to ${destinationPath} in Firebase`);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100', // Set a far future expiration date or customize as needed
    });
    return url;
  } catch (error) {
    console.error(`Error uploading file to Firebase:, error.message`);
    throw error;
  }
}


}