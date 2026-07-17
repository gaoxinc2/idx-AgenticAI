import {
  clearSession,
  getSession,
  updateSession,
} from "./sessionMemory";

const userId = "test-user-1";

console.log("Initial session:");
console.log(getSession(userId));

updateSession(userId, {
  city: "Irvine",
});

console.log("\nAfter adding city:");
console.log(getSession(userId));

updateSession(userId, {
  maxPrice: 1_200_000,
  beds: 3,
  type: "SingleFamilyResidence",
});

console.log("\nAfter adding more preferences:");
console.log(getSession(userId));

clearSession(userId);

console.log("\nAfter clearing session:");
console.log(getSession(userId));