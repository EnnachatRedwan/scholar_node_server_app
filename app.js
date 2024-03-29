const express = require("express");
const neo4j = require("neo4j-driver");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();

//neo4j aura
const uri = 'neo4j+s://df9753de.databases.neo4j.io:7687';
const user = 'neo4j';
const password = 'X7OoXiD0tF1icec28hdE9Vxu0sNTsYsmxbNpZudjVm8';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
//



app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({}));

// local neo4j

// const driver = neo4j.driver(
//   "bolt://localhost",
//   neo4j.auth.basic("neo4j", "abd123")
// );

const session = driver.session();

app.get("/login", (req, res) => {
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
  const user = req.headers.user;
  session
    .run(
      `match(u:user) where toLower(u.fullname) contains tolower('${fullname}') and u.fullname<>'${user}' RETURN u;`
    )
    .then((result) => {
      recs = [];
      result.records.forEach((record) =>
        recs.push({
          fullname: record._fields[0].properties["fullname"],
          speciality: record._fields[0].properties["speciality"],
          guid: record._fields[0].properties["guid"],
        })
      );
      res.send(recs);
    })
    .catch((err) => console.log(err));
});

app.post("/follow", (req, res) => {
  const user1 = req.body.user1;
  const user2 = req.body.user2;
  session
    .run(
      `match(u1:user{guid:'${user1}'}),(u2:user{guid:'${user2}'})
      merge (u1)-[:follows]->(u2);`
    )
    .then((result) => {
      res.send(recs);
    })
    .catch((err) => console.log(err));
});

app.get("/followers", (req, res) => {
  const user = req.headers.guid;
  session
    .run(`match (u:user)-[:follows]->(:user{guid:'${user}'}) return u;`)
    .then((result) => {
      recs = [];
      result.records.forEach((record) =>
        recs.push({
          fullname: record._fields[0].properties["fullname"],
          speciality: record._fields[0].properties["speciality"],
          guid: record._fields[0].properties["guid"],
        })
      );
      res.send(recs);
    })
    .catch((err) => console.log(err));
});

app.post("/add-post", (req, res) => {
  const content = req.body.content;
  const user = req.body.user;
  var tags = req.body.tags;
  tags = JSON.parse(tags);
  const keys = [];

  session
    .run(`match(d:Domaine) RETURN d.title;`)
    .then((result) => {
      result.records.forEach((record) => {
        keys.push(record._fields[0]);
      });
    })
    .then(() => {
      posted = false;
      keys.forEach((key) => {
        if (content.toLowerCase().split(key.toLowerCase()).length - 1 > 2) {
          session2 = driver.session();
          session2
            .run(
              `match (d:Domaine{title:$key})
          match (u:user{guid:$user})
          merge (p:post{user:$user,content:$content})
          merge (u)-[:posted]->(p)
          merge (p)-[:talks_about]->(d);`,
              { user, key, content }
            )
            .then((posted = true))
            .catch((err) => console.log(err));
          return posted;
        }
      });
    })
    .then((posted) => {
      if (!posted) {
        session
          .run(
            `match (u:user{guid:$user})
            merge (u)-[:posted]->(:post{content:$content,user:$user});`,
            { content, user }
          )
          .catch((err) => console.log(err));
      }
    })
    .then(() => {
      tags.forEach((tag) => {
        session3 = driver.session();
        session3.run(
          `match (t:user{guid:'${tag}'})
          match (p:post{user:'${user}',content:'${content}'})
          merge (t)-[:taged_in]->(p)`
        );
      });
      res.send();
    })
    .catch((err) => console.log(err));
});

app.get("/posts", (req, res) => {
  const user = req.headers.user;
  session
    .run(
      `match(u:user{guid:$user})
      match(u)-[:follows]->(f:user)-[:posted]->(p:post)
      return f,p;`,
      { user }
    )
    .then((result) => {
      recs = [];
      result.records.forEach((record) =>
        recs.push({
          fullname: record._fields[0].properties["fullname"],
          speciality: record._fields[0].properties["speciality"],
          content: record._fields[1].properties["content"],
        })
      );
      res.send(recs);
    })
    .catch((err) => console.log(err));
});

app.get('/recommendation',(req,res)=>{
  const user=req.headers.user;
  session.run(`match(d1:Domaine)<-[:talks_about]-(:post{user:'${user}'})<-[:posted]-(:user{guid:'${user}'})-[:follows]->(f)-[:posted]-(p)-[:talks_about]-(d2:Domaine)
  where d1=d2
  match(p)<-[:taged_in]-(t)
  return distinct t;`)
  .then(result=>{
    recs = [];
      result.records.forEach((record) =>
        recs.push({
          fullname: record._fields[0].properties["fullname"],
          speciality: record._fields[0].properties["speciality"],
          guid: record._fields[0].properties["guid"],
        })
      );
      res.send(recs);
  })
  .catch(err=>console.log(err));
});

let port=process.env.PORT || 3000

app.listen(port, () => console.log("Server running on port 3000"));