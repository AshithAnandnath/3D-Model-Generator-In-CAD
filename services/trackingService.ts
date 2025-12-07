import { db } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';

export interface LogEntry {
  id: string;
  prompt: string;
  modelName: string;
  partCount: number;
  timestamp: any; // Firestore timestamp
}

export const logGeneration = async (prompt: string, modelName: string, partCount: number) => {
  if (!db) {
    console.log(`[Offline Mode] Generated: "${prompt}" (${partCount} parts)`);
    return;
  }

  try {
    await addDoc(collection(db, 'prompts'), {
      prompt,
      modelName,
      partCount,
      timestamp: Timestamp.now()
    });
    console.log("Generation logged to system database.");
  } catch (error) {
    console.warn("Tracking failed:", error);
  }
};

export const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  if (!db) {
    // Return empty logs if DB is not configured, preventing crash
    return [];
  }

  try {
    const q = query(
      collection(db, 'prompts'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const logs: LogEntry[] = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      } as LogEntry);
    });

    return logs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    throw new Error("Connection failed. Check permissions.");
  }
};