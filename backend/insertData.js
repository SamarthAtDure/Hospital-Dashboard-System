import { connectDB } from "./config/db.js";
import data from "./data/data.json" with { type: "json" };

async function insertData() {
    const db = await connectDB();

    await db.collection("stats").insertOne(data.stats);
    await db.collection("patientsPerMonth").insertMany(data.patientsPerMonth);
    await db.collection("patientsPerDepartment").insertMany(data.patientsPerDepartment);
    await db.collection("diseaseDistribution").insertMany(data.diseaseDistribution);
    await db.collection("patients").insertMany(data.patients);
    await db.collection("doctors").insertMany(data.doctors);
    await db.collection("appointments").insertMany(data.appointments);

    console.log("All Data Inserted Successfully");
    process.exit();
}

insertData();