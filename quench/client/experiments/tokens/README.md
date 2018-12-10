# Tokens Experiment

Historically, dealing with characters of strings have always required abstractions like flyweight to mitigate the overwhelming and highly transient state costs associated with scanning operations. The choice of abstractions differs based on scanning requirements like directionality and mutability.

**Considerations**

*Token Encapsulation*

The fact that tokens and any other stateful creations in JavaScript cannot be explicitly destroyed can effectively render conventional patterns (especially flyweight) useless unless tokens are properly encapsulated.

*Token Regeneration*

At the same time, the rate of token regeneration can result in unpredictabilite garbage collection cycles that can lead to unmanageable lags.

*Token Addressability*

Linear scanning operations are often superior in that eliminate or at least limit complexities to positionality (ie rows and columns).

Arbitrary scanning introduce various complexities compounded by the loss of sequential precedence inherent to linear operations.

In JavaScript, addressability can take many forms and incorporate various declarative and transient indicators.
