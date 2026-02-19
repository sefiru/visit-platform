package utils

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var minioClient *minio.Client
var minioBucket string

// InitMinIO initializes the MinIO client
func InitMinIO() error {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	user := os.Getenv("MINIO_USER")
	password := os.Getenv("MINIO_PASSWORD")
	bucket := os.Getenv("MINIO_BUCKET")
	useSSL := os.Getenv("MINIO_USE_SSL") == "true"

	if endpoint == "" {
		endpoint = "localhost:9000"
	}
	if user == "" {
		user = "minioadmin"
	}
	if password == "" {
		password = "minioadmin123"
	}
	if bucket == "" {
		bucket = "visit-cards"
	}

	minioBucket = bucket

	// Initialize minio client object
	var err error
	minioClient, err = minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(user, password, ""),
		Secure: useSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to create minio client: %v", err)
	}

	// Create bucket if it doesn't exist
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, bucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %v", err)
	}

	if !exists {
		err = minioClient.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %v", err)
		}
		// Set bucket policy to public read (optional, for direct access)
		// For now, we'll keep it private and serve through API proxy
	}

	return nil
}

// UploadLogo uploads a logo file to MinIO
// Returns the path (key) of the uploaded file
func UploadLogo(ctx context.Context, cardID uint, file io.Reader, fileSize int64, contentType string) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("minio client not initialized")
	}

	// Generate unique filename: visit-cards/{cardID}/logo.{ext}
	ext := filepath.Ext(contentTypeToExtension(contentType))
	objectName := fmt.Sprintf("visit-cards/%d/logo%s", cardID, ext)

	// Upload the file
	_, err := minioClient.PutObject(ctx, minioBucket, objectName, file, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %v", err)
	}

	return objectName, nil
}

// DeleteLogo deletes a logo file from MinIO
func DeleteLogo(ctx context.Context, objectName string) error {
	if minioClient == nil {
		return fmt.Errorf("minio client not initialized")
	}

	if objectName == "" {
		return nil
	}

	err := minioClient.RemoveObject(ctx, minioBucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %v", err)
	}

	return nil
}

// GetLogo retrieves a logo file from MinIO
func GetLogo(ctx context.Context, objectName string) (*minio.Object, error) {
	if minioClient == nil {
		return nil, fmt.Errorf("minio client not initialized")
	}

	if objectName == "" {
		return nil, fmt.Errorf("object name is empty")
	}

	obj, err := minioClient.GetObject(ctx, minioBucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get file: %v", err)
	}

	return obj, nil
}

// contentTypeToExtension maps content type to file extension
func contentTypeToExtension(contentType string) string {
	switch contentType {
	case "image/png":
		return ".png"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	default:
		return ".png" // default to png
	}
}
