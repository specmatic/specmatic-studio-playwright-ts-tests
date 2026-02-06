
# Specmatic Studio Demo - Test Plan

## Application Overview

This test plan validates the core business functionality of Specmatic Studio for API contract testing and mocking, as demonstrated in the official demo and video walkthrough. The focus is on positive user journeys using a desktop browser. All scenarios are declarative, describing business value and expected outcomes rather than UI actions.

## Available API Specifications

The following API specifications are available for testing and mocking:

- `specmatic-studio-demo/specs/product_search_bff_v5.yaml`
- `specmatic-studio-demo/specs/product_search_bff_v5_dictionary.yaml`
- `specmatic-studio-demo/specs/proxy_generated_dictionary.yaml`
- `specmatic-studio-demo/specs/kafka.yaml`
- `specmatic-studio-demo/specs/specmatic.yaml`

## Test Scenarios

### 1. API Specification Management

**Seed:** `tests/seed.spec.ts`

#### 1.1. Select Existing API Specification

**File:** `tests/api-spec-management/select-existing-spec.spec.ts`

**Steps:**
  1. User selects an existing API specification from the available list:
      - `product_search_bff_v5.yaml`
      - `product_search_bff_v5_dictionary.yaml`
      - `proxy_generated_dictionary.yaml`
      - `kafka.yaml`
      - `specmatic.yaml`
    - expect: The selected specification details are displayed, including file path and available actions (mock, test, update, generate examples, etc.).

#### 1.2. Record New API Specification via Proxy

**File:** `tests/api-spec-management/record-new-spec.spec.ts`

**Steps:**
  1. User initiates recording of a new API specification by providing a target service URL and proxy port.
    - expect: Proxy is started and ready to record API calls.
    - expect: User is able to interact with the target service through the proxy.

### 2. API Mocking

**Seed:** `tests/seed.spec.ts`

#### 2.1. Run Mock Server for API Spec

**File:** `tests/api-mocking/run-mock-server.spec.ts`

**Steps:**
  1. User starts a mock server for a selected API specification from the available list.
    - expect: Mock server is started and ready to serve requests as per the specification.
    - expect: Status and port information are displayed.

### 3. API Contract Testing

**Seed:** `tests/seed.spec.ts`

#### 3.1. Execute Contract Tests for API Spec

**File:** `tests/api-contract-testing/execute-contract-tests.spec.ts`

**Steps:**
  1. User executes contract tests for a selected API specification from the available list.
    - expect: Contract tests are executed against the mock or real service.
    - expect: Test results are displayed, showing counts for success, failure, errors, skipped, and total tests.

### 4. Example Generation

**Seed:** `tests/seed.spec.ts`

#### 4.1. Generate Valid Examples from API Spec

**File:** `tests/example-generation/generate-valid-examples.spec.ts`

**Steps:**
  1. User requests generation of valid example requests/responses for a selected API specification from the available list.
    - expect: Valid examples are generated and displayed for the selected specification.

### 5. Service Spec & Config Update

**Seed:** `tests/seed.spec.ts`

#### 5.1. Update Service Specification

**File:** `tests/service-spec-config/update-service-spec.spec.ts`

**Steps:**
  1. User updates the service specification for a selected API spec from the available list.
    - expect: Service specification is updated and confirmation is displayed.

#### 5.2. Edit Specmatic Configuration

**File:** `tests/service-spec-config/edit-config.spec.ts`

**Steps:**
  1. User edits the Specmatic configuration file (`specmatic.yaml`).
    - expect: Configuration changes are saved and reflected in the application.
