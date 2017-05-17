let http = require('http');
let Git = require('nodegit');
let path = require('path');

const repoPath = process.argv[2] || '.';

http.createServer((req, resp) => {
    debugger;
    let x = 1;
    resp.writeHead(200, {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*"
    });

    getCommits(db => resp.end(JSON.stringify(db)));
}).listen(3000);

function getCommits(cb) {
    Git.Repository.open(repoPath)
      .then(function(repo) {
        repo.getReferences(Git.Reference.TYPE.OID)
          .then(function(refs) {

            // Ref is a local branch head
            let re = /^refs\/heads\//;
            return refs.filter(ref => re.test(ref.name()));
          })
          .then(function(refs) {
              let re = /^refs\/heads\/(.*)$/;
              let response = {
                  refs: refs.reduce((obj, r) => {

                      // refs/heads/master = a01b4c...
                      let branchName = re.exec(r.name())[1]
                      obj[branchName] = r.target().tostrS();

                      return obj;
                  }, {}),
                  commits: {}
              };
              Promise.all(refs.map(ref => {
                return repo.getReferenceCommit(ref)
                          .then(function(commit) {
                              return new Promise(function(resolve, reject)  {
                                  // Create a new history event emitter.
                                  var history = commit.history();


                                  // Create a counter to only show up to 9 entries.
                                  var count = 0;

                                  history.on("end", (commits) => {
                                      commits.forEach(c => {
                                          response.commits[c.sha()] = {
                                              author: c.author().name(),
                                              date: c.date(),
                                              message: c.message(),
                                              parents: c.parents().map(oid => oid.tostrS())
                                          };
                                      });
                                      resolve();
                                  })

                                  // Start emitting events.
                                  history.start();
                              });
                          })
                  })
              )
              .then(() => cb(response));
          })
      })
      .catch(function(err) { console.log(err); });

}

