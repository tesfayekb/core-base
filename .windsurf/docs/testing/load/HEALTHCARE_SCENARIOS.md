
# Healthcare Load Testing Scenarios

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Healthcare-specific load testing scenarios focusing on patient record access patterns and HIPAA compliance under load.

## Patient Record Access Pattern

### Scenario Configuration
- **Pattern**: 
  - Baseline: 100 concurrent users
  - Shift change: Spike to 500 concurrent users within 15 minutes
  - Duration: 2 hours (covering complete shift transition)

### Operations
- Patient record retrieval (with medical images)
- Medication administration recording
- Clinical notes entry
- Lab result viewing

### Success Criteria
- Patient record retrieval < 1 second
- No data leakage between patient contexts
- System maintains HIPAA audit logging under load
- Zero errors in medication administration workflow

### Gatling Implementation
```scala
class HealthcareShiftChangeSimulation extends Simulation {
  
  val httpProtocol = http
    .baseUrl("https://hospital-api.example.com")
    .header("X-HIPAA-Compliance", "enabled")
  
  val baselineOperations = scenario("Baseline Hospital Operations")
    .feed(nurseCredentials)
    .feed(patientIds)
    .exec(
      http("Nurse Login")
        .post("/api/auth/login")
        .body(StringBody("""{"username":"${username}","password":"${password}"}"""))
        .check(status.is(200))
        .check(jsonPath("$.token").saveAs("authToken"))
    )
    .exec(
      http("Get Patient Summary")
        .get("/api/patients/${patientId}/summary")
        .header("Authorization", "Bearer ${authToken}")
        .check(responseTimeInMillis.lt(1000))
    )

  setUp(
    baselineOperations.inject(constantUsersPerSec(2) during(15.minutes)),
    shiftChangeOperations.inject(
      rampUsers(400) during(15.minutes),
      constantUsers(400) during(30.minutes)
    )
  ).assertions(
    global.responseTime.p95.lt(2000),
    global.successfulRequests.percent.gt(99.5)
  )
}
```

## Related Documentation

- [Financial Scenarios](FINANCIAL_SCENARIOS.md)
- [E-commerce Scenarios](ECOMMERCE_SCENARIOS.md)
- [Load Testing Overview](../LOAD_TESTING_SCENARIOS.md)
