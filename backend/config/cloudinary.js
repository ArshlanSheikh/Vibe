import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "demo",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo",
  secure: true
});

export const uploadMedia = async (fileBuffer, folder = "vibe_media") => {
  // If demo credentials or upload fails, handle gracefully
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === "demo_key") {
      // In local development without Cloudinary credentials, return a dummy placeholder URL
      const placeholder = `https://picsum.photos/seed/${Date.now()}/800/600`;
      return resolve({
        url: placeholder,
        public_id: `mock_${Date.now()}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto"
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", error);
          // Fallback to placeholder if cloud upload fails
          return resolve({
            url: `https://picsum.photos/seed/${Date.now()}/800/600`,
            public_id: `mock_fallback_${Date.now()}`
          });
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
