// Mock Database Connection for POC
// ในการใช้งานจริง ไฟล์นี้จะใช้ `mysql2/promise` หรือ ORM เช่น Prisma/Drizzle

// จำลอง Connection Pool
class MockDB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(sql: string, params: any[] = []): Promise<any[]> {
    console.log(`[DB Query]: ${sql}`, params);

    // Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, 100));

    // ------------------------------------------------------------------
    // MOCK DATA RESPONSE (จำลองการตอบกลับจาก Database)
    // ------------------------------------------------------------------

    // 1. Mock Login Query
    if (sql.includes("SELECT * FROM students WHERE id = ?")) {
      const inputId = params[0];
      if (inputId === '1234') { // สมมติว่ามีนักเรียนคนนี้
        return [{
          id: '1234',
          name: 'สมชาย',
          surname: 'เรียนดี',
          national_id_hash: 'hashed_secret_123', // ใน DB จริงเก็บ Hash
          class_room: 'ม.6/1',
          role: 'STUDENT'
        }];
      }
      return [];
    }

    // 2. Mock Check Vote History
    if (sql.includes("SELECT 1 FROM vote_history")) {
        // สมมติว่านักเรียนคนนี้ยังไม่เคยโหวต
        // return [{ 1: 1 }]; // ถ้าเคยโหวตแล้ว
        return [];
    }

    // 3. Mock Session Lookup
    if (sql.includes("SELECT * FROM sessions WHERE id = ?")) {
      const sessionId = params[0];
      if (sessionId === 'valid-session-id') {
         return [{
           id: 'valid-session-id',
           student_id: '1234',
           expires_at: new Date(Date.now() + 3600000) // 1 hour from now
         }];
      }
      return [];
    }

    // 4. Mock Create Session
    if (sql.includes("INSERT INTO sessions")) {
      return [{ affectedRows: 1 }];
    }

    // Default empty
    return [];
  }

  // Transaction Helper
  async transaction<T>(callback: (connection: MockDB) => Promise<T>): Promise<T> {
    console.log('[DB] BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      console.log('[DB] COMMIT');
      return result;
    } catch (error) {
      console.log('[DB] ROLLBACK');
      throw error;
    }
  }
}

export const db = new MockDB();
