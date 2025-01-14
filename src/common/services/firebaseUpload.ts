/* eslint-disable prettier/prettier */

import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { Bucket } from '@google-cloud/storage'; 

@Injectable()
export class FirebaseService {
  private bucket: Bucket;

  constructor() {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    this.bucket = admin.storage().bucket() as Bucket; // Use the correct Bucket type
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    try {
      console.log("I am here");
  
      if (!file) {
        throw new NotFoundException("File does not exist");
      }
  
      console.log("file", file);
  
      const fileName = `${uuidv4()}-${file.originalname}`;
      const fileRef = this.bucket.file(fileName);
  
      return new Promise((resolve, reject) => {
        const stream = fileRef.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
        });
  
        stream.on('error', (error) => {
          reject(error);
        });
  
        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileRef.makePublic();
            const publicUrl = fileRef.publicUrl();
            console.log("publicUrl", publicUrl);
            // Resolve with an object containing both the URL and the key
            resolve({ url: publicUrl, key: fileName });
          } catch (error) {
            reject(error);
          }
        });
  
        stream.end(file.buffer);
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error.message ?? 'An error occurred while uploading'
      );
    }
  }
  
}


// async createObject(
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   //@ts-ignore
//   file: Express.Multer.File,
//   // authUser: IAuthUser,
// ): Promise<HttpSuccess<FileDocument>> {
//   let url;
//   let key;

//   const { url: fileUrl, key: fileKey } =
//     await this.cloudinaryService.uploadObject(file);
//   // eslint-disable-next-line prefer-const
//   url = fileUrl;
//   // eslint-disable-next-line prefer-const
//   key = fileKey;

//   const obj = this.parseResponse(file, url, key);
//   const savedFile = await new this.FileModel({
//     ...obj,
//     owner: "image",
//     userType: UserType.provider,
//   }).save();
//   return new HttpSuccess('File successfully uploaded', savedFile, 200);
// }