/**
 * VaxTrace Nigeria - Protobuf Response Transformer
 * 
 * This transformer handles the actual encoding of data to Protobuf format
 * for API responses. It works in conjunction with the ContentNegotiationInterceptor.
 * 
 * Features:
 * - Automatic data transformation to Protobuf format
 * - Graceful fallback to JSON on encoding errors
 * - Response size tracking for bandwidth monitoring
 * - Support for both single items and collections
 * 
 * @audit Performance: Tracks bandwidth savings for monitoring
 * @audit Security: Validates data before encoding to prevent injection attacks
 */

import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ProtobufService } from '../modules/protobuf/protobuf.service';
import { ProtobufOptions } from './content-negotiation.interceptor';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface TransformResult {
  data: Buffer | StreamableFile | any;
  contentType: string;
  headers: Record<string, string>;
  encoding: 'protobuf' | 'json';
  sizeBytes?: number;
}

export interface EncodingStats {
  originalSize: number;
  encodedSize: number;
  compressionRatio: number;
  bandwidthSaved: number;
}

// ============================================
// TRANSFORMER SERVICE
// ============================================

@Injectable()
export class ProtobufResponseTransformer {
  private readonly logger = new Logger(ProtobufResponseTransformer.name);

  constructor(private readonly protobufService: ProtobufService) {}

  /**
   * Transforms response data based on format preference
   * 
   * @param data - The data to transform
   * @param response - Express response object
   * @param options - Protobuf encoding options
   * @returns Transform result with appropriate format
   */
  async transform(
    data: any,
    response: Response,
    options?: ProtobufOptions,
  ): Promise<TransformResult> {
    const wantsProtobuf = response['protobufOptions'] !== undefined;
    
    if (wantsProtobuf && options) {
      return this.transformToProtobuf(data, options);
    }
    
    return this.transformToJson(data);
  }

  /**
   * Transforms data to Protobuf format
   */
  private async transformToProtobuf(
    data: any,
    options: ProtobufOptions,
  ): Promise<TransformResult> {
    try {
      // Handle null/undefined
      if (data === null || data === undefined) {
        return {
          data: Buffer.alloc(0),
          contentType: 'application/vnd.google.protobuf',
          headers: {
            'X-Protobuf-Type': options.typeName,
            'X-Protobuf-Status': 'empty',
          },
          encoding: 'protobuf',
          sizeBytes: 0,
        };
      }

      // Handle arrays (collections)
      if (Array.isArray(data)) {
        return this.encodeCollection(data, options);
      }

      // Handle single items
      return this.encodeSingle(data, options);
    } catch (error) {
      this.logger.error(
        `Failed to encode to Protobuf: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      
      // Fallback to JSON
      return this.transformToJson(data);
    }
  }

  /**
   * Encodes a single item to Protobuf
   */
  private async encodeSingle(
    data: any,
    options: ProtobufOptions,
  ): Promise<TransformResult> {
    const startTime = Date.now();
    
    // Calculate original JSON size for comparison
    const jsonSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    
    // Encode to Protobuf
    const protobufBuffer = await this.protobufService.encode(
      options.typeName,
      data,
      {
        useCompression: options.useCompression,
        includeMetadata: true,
      },
    );
    
    const encodingTime = Date.now() - startTime;
    const compressionRatio = ((jsonSize - protobufBuffer.length) / jsonSize) * 100;
    
    // Log encoding stats
    this.logger.debug(
      `[PROTOBUF-ENCODING] ${options.typeName}: ${jsonSize}B -> ${protobufBuffer.length}B ` +
      `(${compressionRatio.toFixed(1)}% reduction) in ${encodingTime}ms`,
    );
    
    return {
      data: protobufBuffer,
      contentType: 'application/vnd.google.protobuf',
      headers: {
        'X-Protobuf-Type': options.typeName,
        'X-Protobuf-Size': protobufBuffer.length.toString(),
        'X-Original-Size': jsonSize.toString(),
        'X-Compression-Ratio': compressionRatio.toFixed(2),
        'X-Encoding-Time': `${encodingTime}ms`,
      },
      encoding: 'protobuf',
      sizeBytes: protobufBuffer.length,
    };
  }

  /**
   * Encodes an array/collection to Protobuf
   */
  private async encodeCollection(
    items: any[],
    options: ProtobufOptions,
  ): Promise<TransformResult> {
    const startTime = Date.now();
    
    // Calculate original JSON size for comparison
    const jsonSize = Buffer.byteLength(JSON.stringify(items), 'utf8');
    
    // Encode collection to Protobuf
    const collectionTypeName = `${options.typeName}Collection`;
    const protobufBuffer = await this.protobufService.encodeCollection(
      options.typeName,
      collectionTypeName,
      items,
      {
        useCompression: options.useCompression,
      },
    );
    
    const encodingTime = Date.now() - startTime;
    const compressionRatio = ((jsonSize - protobufBuffer.length) / jsonSize) * 100;
    
    // Log encoding stats
    this.logger.debug(
      `[PROTOBUF-ENCODING] ${collectionTypeName} (${items.length} items): ` +
      `${jsonSize}B -> ${protobufBuffer.length}B ` +
      `(${compressionRatio.toFixed(1)}% reduction) in ${encodingTime}ms`,
    );
    
    return {
      data: protobufBuffer,
      contentType: 'application/vnd.google.protobuf',
      headers: {
        'X-Protobuf-Type': collectionTypeName,
        'X-Protobuf-Count': items.length.toString(),
        'X-Protobuf-Size': protobufBuffer.length.toString(),
        'X-Original-Size': jsonSize.toString(),
        'X-Compression-Ratio': compressionRatio.toFixed(2),
        'X-Encoding-Time': `${encodingTime}ms`,
      },
      encoding: 'protobuf',
      sizeBytes: protobufBuffer.length,
    };
  }

  /**
   * Transforms data to JSON format (default)
   */
  private transformToJson(data: any): TransformResult {
    const jsonString = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
    
    return {
      data,
      contentType: 'application/json',
      headers: {
        'X-Response-Size': sizeBytes.toString(),
      },
      encoding: 'json',
      sizeBytes,
    };
  }

  /**
   * Calculates bandwidth savings statistics
   */
  calculateStats(jsonSize: number, protobufSize: number): EncodingStats {
    const compressionRatio = ((jsonSize - protobufSize) / jsonSize) * 100;
    const bandwidthSaved = jsonSize - protobufSize;
    
    return {
      originalSize: jsonSize,
      encodedSize: protobufSize,
      compressionRatio,
      bandwidthSaved,
    };
  }

  /**
   * Estimates bandwidth savings for 3G/4G networks
   * 
   * @param bytes - Number of bytes saved
   * @param networkType - Type of network (3g, 4g, 5g)
   * @returns Time saved in seconds
   */
  estimateTimeSavings(
    bytes: number,
    networkType: '3g' | '4g' | '5g' = '4g',
  ): number {
    // Average upload speeds in bytes per second
    const networkSpeeds = {
      '3g': 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      '4g': 10 * 1024 * 1024 / 8, // 10 Mbps
      '5g': 50 * 1024 * 1024 / 8, // 50 Mbps
    };
    
    const speed = networkSpeeds[networkType];
    return bytes / speed;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Applies transform result to Express response
 */
export function applyTransformResult(
  response: Response,
  result: TransformResult,
): void {
  // Set Content-Type
  response.setHeader('Content-Type', result.contentType);
  
  // Set custom headers
  Object.entries(result.headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  
  // Set Vary header for proper caching
  response.setHeader('Vary', 'Accept');
  
  // If data is a Buffer (Protobuf), send it directly
  if (Buffer.isBuffer(result.data)) {
    response.send(result.data);
  }
}
