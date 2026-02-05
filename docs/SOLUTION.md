# Problem

Our organization is participating in an energy market auction. We get customer orders via a POST API ([post_lambda](./src/post_lambda/)). The post_lambda saves the orders to an audit database that persists the data for 24 hours. A data pipeline runs periodically which comprises of [lambda_a](./src/lambda_a/) and [lambda_b](./src/lambda_b/) -

- lambda_a (in real production scenario), 
  - retrieves the orders from the DB
  - calls the external auction platform
  - based on the results, updates the order status in DB. 
  - Then, it forwards the results to lambda_b. 
  
  In the context of this take home assignment, lambda_a mocks 
  - retrieving the orders from the DB
  - calling the external auction platform
  - updating it back in the DB.

  It simply forwards the results to lambda_b. 
  
  Implementing all the mocked behaviour is outside the scope of this take home assignment.

- lambda_b simply saves the (order) results in S3, only if they are accepted.

You are asked to complete the lambda code where it says "Complete the code", design the architecture and provision the infrastructure to deploy all required resources to AWS using aws-cdk for IaC (with Typescript).

# Architecture

![architecture](./architecture.png)

# Requirements
From the original [README.md](./README.md) and clarification email

## Stack

- You are asked to provide the Infrastructure to deploy all required resources to AWS using aws-cdk for IaC (with Typescript).
- (Optional) Write tests for aws cdk constructs and ensure that the tests are executed in GitHub Actions stage.
- Everything should be deployed to *eu-west-1* region.

## Deployment Pipeline

- Create AWS deployment Pipeline that deploys the app from a GitHub repo to our AWS account using CodePipeline (we provide the base code).
- All merges to master should automatically deploy the code to Dev environment.
- Create a simple GitHub Actions workflow to run on merge to master.
- (Optional) Write tests for aws cdk constructs and ensure that the tests are executed in GitHub Actions stage.
- (Optional) We should receive a Slack notification (don’t have to link the actual messaging app) if the Deployment Pipeline fails.
- The two pipelines exist for different purposes. They solve different problems, which helps ensure separation of concerns: GitHub Actions can handle CI tasks such as testing and linting, while CodePipeline manages AWS deployments. This separation can also improve security, since CodePipeline does not need GitHub credentials with broad repository access and can rely on native IAM roles instead. In addition, some organizations mandate AWS native tooling for production deployments to keep audit trails within CloudTrail.

## Database

- The whole solution should be serverless.
- Data in the database should expire after 24 hours.

## API Lambda

- There is an API lambda that processes POST requests and stores data in a Database.

Request body example:
` 
[ { "record_id": "unique_id_1", "parameter_1": "abc", "parameter_2": 4, },{ "record_id": "unique_id_2", "parameter_1": "def", "parameter_2": 2.1, }, ]
`

## Data Pipeline

### Lambda A

- The Data Pipeline should be triggered by schedule and execute several lambdas in a row. Lambda A that randomly generates True/False value and returns:


```
// Lambda with ready results 
{ 
  "results": true,
  "orders": [
   { 
      "order": "accepted"
   },
   {
     "order": "rejected" 
   }
   ]
 } 
// OR 
// Lambda with results not ready 
{ 
  "results": false 
}
```
- There should be a validation of the Lambda A output checking the results field. If the results are false, Lambda A should be re-triggered until the results are true.
- Code for Lambda A, B and post has been provided. The provided Lambda code should only be completed and not modified.

### Lambda B

- Lambda B that gets order from the event and raised an error, if the order status is rejected. Otherwise, it should be able to store results in S3 Bucket called “order-results” .
- If Lambda B raises an error, there should be a notification sent to a Slack Channel or similar app (don’t have to link the actual messaging app).
- Code for Lambda A, B and post has been provided. The provided Lambda code should only be completed and not modified.

# Workplan

## Step 1: Bootstrap the project

1. Start the skeleton of CDK stack
2. Add a Github Actions workflow to lint and test the code
3. Add a AWS CodePipeline to automatically deploy the stack to dev and prod on merge to master

## Step 2: Complete the API

1. Add the DynamoDB as the database
2. Add post_lambda in the CDK stack
3. Complete the lambda to save the data in DynamoDB
4. Hook up the post_lambda to API Gateway
5. Test the API and see if the results are saved as expected in the DynamoDB

## Step 3: Complete the data pipeline

1. Hook up lambda_a in the CDK stack
2. Add the “order-results” S3 bucket
3. Complete lambda_b to save the objects in S3
4. Create a step function to orchestrate the data pipeline