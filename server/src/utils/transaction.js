import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

/**
 * Safely runs a function within a MongoDB transaction if supported.
 * If transactions are not supported (e.g., standalone instance), 
 * it runs the function without a session.
 * 
 * @param {Function} fn - Async function to run. Receives session as argument.
 * @returns {Promise<any>} Result of the function.
 */
export const withTransaction = async (fn) => {
    // Check if the connection is a replica set
    const isReplicaSet = mongoose.connection.getClient().topology?.description?.type !== 'Single';
    
    if (!isReplicaSet && process.env.NODE_ENV !== 'production') {
        // Fallback for standalone local development
        logger.debug('Running without transaction (Standalone MongoDB instance detected)');
        return await fn(null);
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        await session.endSession();
    }
};
