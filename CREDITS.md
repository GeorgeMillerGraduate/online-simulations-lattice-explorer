# Sources and credits

## Mathematical references

- Steven Galbraith, *Mathematics of Public Key Cryptography*, Chapter 17: Lattice Basis Reduction. Gauss reduction, Gram–Schmidt and LLL.
  https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch17.pdf
- Steven Galbraith, Chapter 18: Algorithms for the Closest and Shortest Vector Problems. Babai methods, enumeration and their guarantees.
  https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch18.pdf
- Oded Regev, Lattices in Computer Science, Fall 2004, Lecture 3 (scribe: Eyal Kaplan). Nearest-plane approximation after LLL reduction.
  https://cims.nyu.edu/~regev/teaching/lattices_fall_2004/ln/cvp.pdf
- Oded Regev, lattice-based cryptography survey. Context for lattice problems and LLL.
  https://cims.nyu.edu/~regev/papers/pqc.pdf

These publications are linked as references, not redistributed. Their authors retain their copyrights. Explanations and code in this app are newly written for Jenga Code, rather than copied from a library or textbook implementation.

The exact coefficient-box bound follows directly from `z = (v − t) B⁻¹ + t B⁻¹` and the triangle inequality. See README.md for its integer implementation and limits. This is not a claim to implement the more efficient sphere-enumeration methods in the reference books.

## Artwork

`assets/lattice-study.webp`: original AI-generated editorial illustration created for this application with OpenAI image generation, optimized to 720 × 480 WebP. Prompt: brass drafting compass over a geometric parallelogram and vector construction; copper and muted navy engraving on pale cream paper; restrained sage accent, no typography or logos.

The artwork is decorative. The working lattice, points, vectors and coordinates are native SVG computed from user input, with all labels supplied by the application.

The compass logo follows the supplied Jenga Code site design. No external fonts, icons or JavaScript packages are required at runtime.
