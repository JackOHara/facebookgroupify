## Observability
Currently we can see the logs in Cloudwatch for each individual run of an ECS task or Lambda.

All logs are tagged with the job ID (unique ID created on scrape), playlist ID, group ID and batch ID (in the case of lambdas). It would be nice to improve our observability of the app by being able to see all the logs and filtering on one of these tags. 

It would also be nice if we could enable x ray tracing to give us a good idea of where bottlenecks occur. 

