const express = require("express");
const neo4j = require("neo4j-driver");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic("neo4j", "abd123")
);

const session = driver.session();

app.get("/login", (req, res) => {
  console.log(req.headers);
  const email = req.headers.email;
  const password = req.headers.password;
  session
    .run(`match (u:user{email:'${email}',password:'${password}'}) return u;`)
    .then((result) => res.send(result.records[0]._fields[0].properties))
    .catch((err) => {
      console.log(err);
      res.status(401).send({});
    });
});

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const fullname = req.body.fullname;
  const speciality = req.body.speciality;
  const guid = uuidv4();
  session
    .run(
      `create (:user{fullname:'${fullname}',speciality:'${speciality}',email:'${email}',password:'${password}',guid:'${guid}'});`
    )
    .then((result) => res.status(200).send())
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
  res.send();
});

app.get("/search", (req, res) => {
  const fullname = req.headers.fullname;
  session
    .run(
      `match(u:user) where toLower(u.fullname) contains tolower('${fullname}') RETURN u;`
    )
    .then((result) => {
      recs=[];
      result.records.forEach(record=>recs.push({
        "fullname":record._fields[0].properties["fullname"],
        "speciality":record._fields[0].properties["speciality"],
        "guid":record._fields[0].properties["guid"],
      }))
      res.send(recs);
    })
    .catch((err) => console.log(err));
});

app.listen(3000, () => console.log("Server running on port 3000"));
