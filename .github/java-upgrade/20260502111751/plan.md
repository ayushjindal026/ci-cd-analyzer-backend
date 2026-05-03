# Upgrade Plan: cicd-analyzer (20260502111751)

- **Generated**: 2026-05-02 11:20:00
- **HEAD Branch**: N/A
- **HEAD Commit ID**: N/A

## Available Tools

**JDKs**
- JDK 21.0.9: C:\Program Files\Java\jdk-21\bin (current project JDK, used by steps 1-3)

**Build Tools**
- Maven 3.9.9: C:\Users\hp\Downloads\apache-maven-3.9.9-bin\apache-maven-3.9.9\bin
- Maven Wrapper: api-service/.mvn/wrapper/maven-wrapper.properties -> 3.9.14

## Guidelines

> Note: You can add any specific guidelines or constraints for the upgrade process here if needed, bullet points are preferred.

## Options

- Working branch: appmod/java-upgrade-20260502111751
- Run tests before and after the upgrade: true

## Upgrade Goals

- Upgrade Java runtime to the latest LTS version: Java 21

## Technology Stack

| Technology/Dependency           | Current                     | Min Compatible | Why Incompatible |
| ------------------------------- | --------------------------- | -------------- | ---------------- |
| Java                            | 21                          | 21             | User requested latest LTS; already satisfied |
| Spring Boot                     | 3.5.14                      | 3.5.14         | Compatible with Java 21 |
| Maven                           | 3.9.9                       | 3.9.0          | Maven 3.9+ required for Java 21 |
| Maven Wrapper                   | 3.9.14                      | 3.9.0          | Compatible with Java 21 |
| maven-compiler-plugin           | Spring Boot managed default | 3.11+ implied  | Spring Boot 3.5 uses Java 21-friendly compiler plugin |
| PostgreSQL JDBC driver          | 42.7.10                     | 42.7.10       | No Java compatibility issue, but runtime timezone config needs attention |

## Derived Upgrades

- No Java version upgrade required because the current project already targets Java 21.
- No Spring Boot or Maven version upgrade required for Java 21 support.

## Upgrade Steps

- Step 1: Setup Environment
  - **Rationale**: Validate that the current build environment already satisfies the Java 21 runtime goal.
  - **Changes to Make**:
    - Confirm JDK 21 is available on the system.
    - Confirm Maven 3.9.9 is available for root build execution.
    - Confirm the api-service Maven wrapper is at 3.9.14.
    - Do not change Java target properties because the project is already at Java 21.
  - **Verification**: `mvn -q -DskipTests clean test-compile` from backend root, JDK 21, expected result: success.

- Step 2: Setup Baseline
  - **Rationale**: Establish that current compilation and test behavior are stable under Java 21 before any further action.
  - **Changes to Make**:
    - Run the existing Maven test suite with current project settings.
    - Record baseline pass/fail status for compilation and tests.
  - **Verification**: `mvn -q test` from backend root, JDK 21, expected result: success.

- Step 3: Final Validation and Runtime Check
  - **Rationale**: Verify final upgrade status and document remaining environment-specific runtime issues outside the code-level Java upgrade.
  - **Changes to Make**:
    - Confirm that no Java version changes are needed in POM properties.
    - Confirm the runtime environment uses Java 21 for `spring-boot:run` or packaged execution.
    - Document the PostgreSQL timezone alias issue (`Asia/Calcutta`) as a runtime compatibility risk.
  - **Verification**: `mvn -q test` from backend root, JDK 21, expected result: success.

## Key Challenges

- **Runtime timezone negotiation with PostgreSQL**
   - **Challenge**: The application environment may be using the legacy timezone alias `Asia/Calcutta`, which PostgreSQL rejects during connection startup.
   - **Strategy**: Keep the codebase on Java 21 and document the need to standardize the Java/system timezone to a supported alias such as `Asia/Kolkata` or `UTC` for runtime execution.

