<?php

if (!defined('STRIPE_SECRET_KEY')) {
    define('STRIPE_SECRET_KEY','sk_test_51TIIzFCmTbH1UkuX7fYkjm5xa6QEgKXqjPzYeen3h7l5hyZNbTSu27udDLHtvmxDhCwrtZ6yqP8HofbTBU6Ei1e600rzul9uiQ');
}

if (!defined('STRIPE_PUBLISHABLE_KEY')) {
    define('STRIPE_PUBLISHABLE_KEY', 'pk_test_51TIIzFCmTbH1UkuXnqn7jm8XkL9mN0pQ2rSt3uVwXyZ4aB5cDeFgHiJk6LmNoPqRsT');
}

if (!defined('STRIPE_CHECKOUT_CURRENCY')) {
    define('STRIPE_CHECKOUT_CURRENCY', 'lkr');
}
