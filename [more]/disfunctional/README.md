# Disfunctional

No, it's not Aspect-Oriented Programming (AOP), just Aspect-like programming with all the goodness and ugliness of JavaScript.

## Stateful Flow (`meta-state`)

Functions within an application's execution flows can be viewed as layered fractal graphs. At the top layer, there is likely some configuration which will end up trickling down through the lower layers of the execution flow, trickling down in the form of parameters to some layers then finally in the form of a conditionally determined execution vector (ie method a versus b). This compositional abstraction of runtime is what can be considered the "meta-state".

Such meta-state is theoretically orthogonal to the actual application-consumed state (ie documents being edited, user profiles… etc.), where only their side-effects will every indirectly influence the other.

### Meta vs Consumed vs Volatile

A good way to reason about meta-state is to try to look at what is normally considered volatile state from the perspective similar to that of the of the optimizer in the JavaScript compiler.

From this perspective, the compiler state has figured out a much more efficient divide between that is predictable and what is not. Moving back to the developer's perspective and looking at the deterministic portions of your execution flow vectors.

Just like the optimizer state example above, meta-state is determined entriely by this particular program. However, aside from this and the that it is created and destroyed at runtime, meta-state is not like the rest of the volatile state.

From that, meta-state can be defined as a subset of any runtime state, which is not application-consumed state, but can in theory be captured using declarative records, setting them apart also for what is truely volatile state.

### Layered Execution Flows

Applications can be broken down to three basic functional layers. Some functions initiate, some functions control, some do a bit of both, and the rest simply operate.

Operations are ones that are called with an consumable input, and should not normally require flags or configuration, dealing only with their own internal volatile state and the input and output that indirectly derives from and to the application-consumed-state.

Controllers are ones that are given some form of meta-state that determines the execution flow vector, or the chain of operations which directly derive from and to a specific slice of the application-consumed-state.

Initiators are the top-level of any given exectuion flow vector. They control the flow of meta-state and the actual controllers through which they are realized. They include the application's bootstrapper as well as the user-facing configurational façades of the various integrated packages used in applications. They often depend on encapsulated operations, and some of those are common ones that are shared with controllers.
