import {db} from "./db.js";

async function seedDatabase() {
    console.log('Initializing database schema...');

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS routes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                path_coordinates JSONB NOT NULL
            );
        `);
        console.log('Created "routes" table.');

        await db.query('TRUNCATE TABLE routes CASCADE;');

        const mockPath = [
            { lat: 40.7128, lng: -74.0060 }, 
            { lat: 40.7200, lng: -74.0060 },
            { lat: 40.7300, lng: -74.0060 },
            { lat: 40.7400, lng: -74.0060 }
        ];

        await db.query(
            'INSERT INTO routes (name, path_coordinates) VALUES ($1, $2);',
            ['Route 101 - Downtown Express', JSON.stringify(mockPath)]
        );
        console.log('uccessfully seeded "Route 101" into the database.');

      
        const res = await db.query('SELECT * FROM routes;');
        console.log('Current Routes in DB:', res.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seedDatabase();