## Refactoring for Testing and Extensibility

The Lambda functions and scraper apps have were initially written as a hack to test my idea. It is written using loose JS and functionally. As I add more features/improvements it becomes a bit more difficult to maintain and test. 

The code should be refectored in an OOP style so it can be easily unit tested with dependency injection.

Bonus points if we use TypeScript. It will lead to quicker feedback when developing and (hopefully) lead to less bugs based around JS looseness. 

A proper build action should be enabled in the repo after tests are added.
