#!/bin/bash

# ============================================
# API Testing Script
# ============================================
#
# This script provides example requests to test the API.
# Make sure the server is running before executing.
#
# Usage:
#   ./tests/examples.sh
#
# Prerequisites:
#   - Server running on http://localhost:3000
#   - jq installed (optional, for pretty JSON output)
# ============================================

# API base URL
BASE_URL="http://localhost:3000/api/v1"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Helper Functions
# ============================================

# Print section header
print_header() {
    echo -e "\n${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}\n"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Print info message
print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Make HTTP request and display response
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4

    local url="${BASE_URL}${endpoint}"

    print_info "Request: ${method} ${url}"

    if [ -n "$data" ]; then
        print_info "Data: ${data}"
    fi

    echo ""

    # Build curl command
    local cmd="curl -s -X ${method} '${url}'"

    # Add headers
    if [ -n "$headers" ]; then
        cmd="${cmd} ${headers}"
    fi

    # Add data if present
    if [ -n "$data" ]; then
        cmd="${cmd} -d '${data}'"
    fi

    # Execute request and pretty print if jq is available
    if command -v jq &> /dev/null; then
        eval ${cmd} | jq '.' 2>/dev/null || eval ${cmd}
    else
        eval ${cmd}
    fi

    echo ""
}

# ============================================
# Health Check
# ============================================
test_health() {
    print_header "Health Check"

    make_request "GET" "/health" "" "-H 'Content-Type: application/json'"
}

# ============================================
# List Items
# ============================================
test_list_items() {
    print_header "List All Items"

    make_request "GET" "/items" "" "-H 'Content-Type: application/json'"
}

# ============================================
# Reserve Item
# ============================================
test_reserve() {
    print_header "Reserve an Item"

    local user_id="user_$(shuf -i 1000-9999 -n 1)"
    local item_id="item_1"
    local qty=1

    local data=$(cat <<EOF
{
  "userId": "${user_id}",
  "itemId": "${item_id}",
  "qty": ${qty}
}
EOF
)

    local idempotency_key="reserve-key-$(shuf -i 10000-99999 -n 1)"

    make_request "POST" "/reserve" "${data}" \
        "-H 'Content-Type: application/json' -H 'Idempotency-Key: ${idempotency_key}'"

    # Store reservation ID for subsequent tests
    if command -v jq &> /dev/null; then
        RESPONSE=$(make_request "POST" "/reserve" "${data}" \
            "-H 'Content-Type: application/json' -H 'Idempotency-Key: ${idempotency_key}'")
        RESERVATION_ID=$(echo ${RESPONSE} | jq -r '.data.id // empty')
        if [ -n "$RESERVATION_ID" ]; then
            print_success "Reservation created: ${RESERVATION_ID}"
        fi
    fi
}

# ============================================
# Confirm Reservation
# ============================================
test_confirm() {
    print_header "Confirm Reservation"

    # Note: Replace RESERVATION_ID with actual ID from reserve response
    local reservation_id="${RESERVATION_ID:-res_example_id}"

    local data=$(cat <<EOF
{
  "userId": "user_1",
  "reservationId": "${reservation_id}"
}
EOF
)

    local idempotency_key="confirm-key-$(shuf -i 10000-99999 -n 1)"

    make_request "POST" "/confirm" "${data}" \
        "-H 'Content-Type: application/json' -H 'Idempotency-Key: ${idempotency_key}'"
}

# ============================================
# Cancel Reservation
# ============================================
test_cancel() {
    print_header "Cancel Reservation"

    # Note: Replace RESERVATION_ID with actual ID from reserve response
    local reservation_id="${RESERVATION_ID:-res_example_id}"

    local data=$(cat <<EOF
{
  "userId": "user_1",
  "reservationId": "${reservation_id}"
}
EOF
)

    make_request "POST" "/cancel" "${data}" \
        "-H 'Content-Type: application/json'"
}

# ============================================
# Test Idempotency
# ============================================
test_idempotency() {
    print_header "Test Idempotency (Duplicate Request)"

    local idempotency_key="test-idempotency-$(shuf -i 10000-99999 -n 1)"

    local data=$(cat <<EOF
{
  "userId": "user_idempotency_test",
  "itemId": "item_1",
  "qty": 1
}
EOF
)

    print_info "First request..."
    make_request "POST" "/reserve" "${data}" \
        "-H 'Content-Type: application/json' -H 'Idempotency-Key: ${idempotency_key}'"

    echo ""
    print_info "Second request with same key (should return cached response)..."
    make_request "POST" "/reserve" "${data}" \
        "-H 'Content-Type: application/json' -H 'Idempotency-Key: ${idempotency_key}'"
}

# ============================================
# Test Validation Errors
# ============================================
test_validation() {
    print_header "Test Validation Errors"

    local data=$(cat <<EOF
{
  "userId": "",
  "itemId": "invalid_item",
  "qty": 10
}
EOF
)

    make_request "POST" "/reserve" "${data}" \
        "-H 'Content-Type: application/json'"
}

# ============================================
# Test Out of Stock
# ============================================
test_out_of_stock() {
    print_header "Test Out of Stock Error"

    local data=$(cat <<EOF
{
  "userId": "user_stock_test",
  "itemId": "item_2",
  "qty": 100
}
EOF
)

    make_request "POST" "/reserve" "${data}" \
        "-H 'Content-Type: application/json'"
}

# ============================================
# Run All Tests
# ============================================
run_all_tests() {
    print_header "Running All API Tests"

    test_health
    test_list_items
    test_reserve
    test_confirm
    test_cancel
    test_idempotency
    test_validation
    test_out_of_stock

    print_header "Test Suite Complete"
}

# ============================================
# Main
# ============================================

# Check if server is running
print_info "Checking if server is running..."
if curl -s "${BASE_URL}/../health" > /dev/null 2>&1; then
    print_success "Server is running"
else
    print_error "Server is not running. Please start the server first:"
    echo "  npm run dev"
    exit 1
fi

# Parse command line arguments
case "${1:-all}" in
    health)
        test_health
        ;;
    items)
        test_list_items
        ;;
    reserve)
        test_reserve
        ;;
    confirm)
        test_confirm
        ;;
    cancel)
        test_cancel
        ;;
    idempotency)
        test_idempotency
        ;;
    validation)
        test_validation
        ;;
    stock)
        test_out_of_stock
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "Usage: $0 [test_name]"
        echo ""
        echo "Available tests:"
        echo "  all          - Run all tests (default)"
        echo "  health       - Test health endpoint"
        echo "  items        - List items"
        echo "  reserve      - Create a reservation"
        echo "  confirm      - Confirm a reservation"
        echo "  cancel       - Cancel a reservation"
        echo "  idempotency  - Test idempotency"
        echo "  validation   - Test validation errors"
        echo "  stock        - Test out of stock error"
        exit 1
        ;;
esac

echo ""
print_success "Tests completed!"
