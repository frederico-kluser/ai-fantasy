import fc from "fast-check";

/**
 * Property tests run with a fixed seed so a failure always reproduces
 * (testing-strategy §5). Override per assertion with `fc.assert(p, { seed })`.
 */
fc.configureGlobal({ seed: 20261109 });
