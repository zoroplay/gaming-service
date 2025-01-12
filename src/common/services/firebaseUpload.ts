// /* eslint-disable prettier/prettier */

// import { Injectable } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import { v4 as uuidv4 } from 'uuid';
// import { Bucket } from '@google-cloud/storage'; 

// @Injectable()
// export class FirebaseService {
//   private bucket: Bucket;

//   constructor() {
//     // Initialize Firebase Admin SDK
//     admin.initializeApp({
//       credential: admin.credential.cert({
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//       }),
//       storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//     });

//     this.bucket = admin.storage().bucket() as Bucket; // Use the correct Bucket type
//   }

//   async uploadImage(file: Express.Multer.File): Promise<string> {
//     console.log("I am here");
//     if (!file) {
//       throw new Error('No file provided');
//     }

//     console.log("file", file);

//     const fileName = `${uuidv4()}-${file.originalname}`;
//     const fileRef = this.bucket.file(fileName);

//     return new Promise((resolve, reject) => {
//       const stream = fileRef.createWriteStream({
//         metadata: {
//           contentType: file.mimetype,
//         },
//       });

//       stream.on('error', (error) => {
//         reject(error);
//       });

//       stream.on('finish', async () => {
//         try {
//           // Make file publicly accessible
//           await fileRef.makePublic();
//           const publicUrl = fileRef.publicUrl();
//           console.log("publicUrl", publicUrl);
//           resolve(publicUrl);
//         } catch (error) {
//           reject(error);
//         }
//       });

//       stream.end(file.buffer);
//     });
//   }
// }
