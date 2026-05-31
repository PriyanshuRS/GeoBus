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

        const routeIITtoCentral = [
            { lat: 26.5123, lng: 80.2329 }, 
            { lat: 26.4950, lng: 80.2600 },
            { lat: 26.4820, lng: 80.3010 },
            { lat: 26.4764, lng: 80.3235 },
            { lat: 26.4542, lng: 80.3512 }
        ];

        const routeKidwaitoMotiJheel = [
            { lat: 26.4258, lng: 80.3444 },
            { lat: 26.4380, lng: 80.3150 },
            { lat: 26.4590, lng: 80.3100 },
            { lat: 26.4764, lng: 80.3235 }
        ];

        const routeCentralShuttle = [
            { lat: 26.4542, lng: 80.3512 },
            { lat: 26.4440, lng: 80.3550 },
            { lat: 26.4258, lng: 80.3444 }
        ];

        await db.query(
            'INSERT INTO routes (name, path_coordinates) VALUES ($1, $2);',
            ['Route 201 - IIT Kanpur to Kanpur Central', JSON.stringify(routeIITtoCentral)]
        );

        await db.query(
            'INSERT INTO routes (name, path_coordinates) VALUES ($1, $2);',
            ['Route 202 - Kidwai Nagar to Moti Jheel', JSON.stringify(routeKidwaitoMotiJheel)]
        );

        await db.query(
            'INSERT INTO routes (name, path_coordinates) VALUES ($1, $2);',
            ['Route 203 - Central to Kidwai Nagar Shuttle', JSON.stringify(routeCentralShuttle)]
        );
        console.log('Successfully seeded Kanpur routes into the database.');

      
        const res = await db.query('SELECT * FROM routes;');
        console.log('Current Routes in DB:', res.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seedDatabase();