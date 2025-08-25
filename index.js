require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).send({ message: "Unauthorized access!" });
  }
  // verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized access!" });
    }
    req.user = decoded;
    next();
  });
};
app.post("/logout", (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: false,
    })
    .send({ success: true });
});

app.use(express.json());

// Middleware function

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@coffeestore.vf4l8z4.mongodb.net/?retryWrites=true&w=majority&appName=coffeeStore`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");

    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortal")
      .collection("job_applications");

    // auth related apis
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // GET job applications by applicant email
    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (!email)
        return res.status(400).send({ error: "Email query required" });
      const query = { applicant_email: email };

      console.log(req.cookies?.token);
      //token email !== query email
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const applications = await jobApplicationCollection.find(query).toArray();

      // fokira way to aggregate.
      for (const app of applications) {
        if (ObjectId.isValid(app.job_id)) {
          const job = await jobsCollection.findOne({
            _id: new ObjectId(app.job_id),
          });
          if (job) {
            app.title = job.title;
            app.location = job.location;
            app.company_name = job.company_name;
            app.company_logo = job.company_logo;
            app.applicationCount = job.applicationCount;
          }
        }
      }

      return res.send(applications);
    });

    // DELETE a job application by ID
    app.delete("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ error: "Invalid ID" });
      const result = await jobApplicationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      return res.send(result);
    });

    // PATCH update job application status
    app.patch("/job-applications/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });
    // GET jobs
    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });
    // jobs related api's...
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET job by ID
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ error: "Invalid ID" });
      const result = await jobsCollection.findOne({ _id: new ObjectId(id) });
      return res.send(result);
    });
    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      // not the best way.(use agregate)..fokira way
      //====skip it
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const job = await jobsCollection.findOne(query);
      console.log(job);

      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }
      // now update the job info...
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          applicationCount: newCount,
        },
      };
      const updateResult = await jobsCollection.updateOne(filter, updatedDoc);

      res.send({ result, updateResult });
    });
    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });
  } finally {
    // client কে open রাখুন
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("🚀 Job Portal API is running..."));

app.listen(port, () =>
  console.log(`✅ Server running at http://localhost:${port}`)
);
