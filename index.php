<?php

function getAge($then)
{
    $then_ts = strtotime($then);
    $then_year = date("Y", $then_ts);
    $age = date("Y") - $then_year;
    if (strtotime("+" . $age . " years", $then_ts) > time()) {
        $age--;
    }
    return $age;
} ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="module/tailwind.css" rel="stylesheet">
    <link href="module/style.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">

    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="icon" href="./img/logo-tp.png">

    <title>Istaqom Wirawan Adi Pratama</title>
</head>
<body class="pb-10 pt-10">
  <div class="gradient bg-white rounded-lg container mx-auto w-4/5">
    <div class="flex justify-center pt-4">
      <a href="index.php" class="">
        <img src="./img/logo-tp.png" class="object-center w-40 sm:w-40 md:w-44 lg:w-48 xl:w-52 2xl:w-56">
      </a>
    </div>
      <p class="roboto-500 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-center pl-2 pr-2 pb-2">
        Hello, I'm Istaqom Wirawan Adi Pratama
      </p>

      <p class="roboto-300 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-center pl-2 pr-2 pb-10">
        An <?= getAge("2002-09-15") ?>-years-old college student majoring in Informatics from Samarinda, Indonesia.
      </p>

      <div class="flex justify-center pb-10">
        <img src="./img/me.jpg" class="border-8 border-orange object-center w-52 sm:w-64 md:w-72 lg:w-80 xl:w-96 rounded-full">
      </div>

      <hr class="pb-10">

      <!--Languages-->
      <p class="roboto-500 sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-center pt-2 pl-2 pr-2 pb-2">
        Languages
      </p>

      <p class="roboto-300 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pl-2 pr-2 pb-10">
        that I'm quite good at
      </p>

      <div class="grid justify-center grid-flow-col justify-item-center gap-8 pb-20 pl-2 pr-2">
        <div>
          <img src="img/php.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            PHP
          </p>
        </div>

        <div>
          <img src="img/html-5.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            HTML
          </p>
        </div>

        <div>
          <img src="img/css-3.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            CSS
          </p>
        </div>

        <div>
          <img src="img/python.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            Python
          </p>
        </div>

      </div>

      <!--Frameworks-->
      <p class="roboto-500 sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-center pt-2 pl-2 pr-2 pb-2">
        Frameworks
      </p>

      <p class="roboto-300 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pl-2 pr-2 pb-10">
        that I usually use
      </p>

      <div class="grid justify-center grid-flow-col justify-item-center gap-8 pb-20 pl-2 pr-2">
        <div>
          <img src="img/laravel.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            Laravel
          </p>
        </div>

        <div>
          <img src="img/jquery.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            jQuery
          </p>
        </div>

        <div>
          <img src="img/tailwind-css.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            Tailwind CSS
          </p>
        </div>

      </div>

      <!--Tools-->
      <p class="roboto-500 sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-center pt-2 pl-2 pr-2 pb-2">
        Tools
      </p>

      <p class="roboto-300 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pl-2 pr-2 pb-10">
        that I love to use
      </p>

      <div class="grid justify-center grid-flow-col justify-item-center gap-8 pb-20 pl-2 pr-2">
        <div>
          <img src="img/vscode.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            VSCode
          </p>
        </div>

        <div>
          <img src="img/git.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            Git
          </p>
        </div>

        <div>
          <img src="img/npm.svg" class="h-14 w-14 xl:h-32 xl:w-32 pb-2">
          <p class="roboto-400 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pb-10">
            npm
          </p>
        </div>

      </div>
  </div>
  
  <!--Socmed-->
  <div class="grid justify-center grid-flow-col justify-item-center gap-4 pt-5 pl-2 pr-2">
    <div>
      <a href="mailto:istaqom@gmail.com">
        <img src="img/gmail.svg" class="h-10 w-10 pb-2">
      </a>
    </div>

    <div>
      <a href="https://www.facebook.com/istaqom/">
        <img src="img/facebook.svg" class="h-10 w-10 pb-2">
      </a>
    </div>

    <div>
      <a href="https://twitter.com/istaqom">
        <img src="img/twitter.svg" class="h-10 w-10 pb-2">
      </a>
    </div>

    <div>
      <a href="https://www.instagram.com/istaqomwirawan/">
        <img src="img/instagram.svg" class="h-10 w-10 pb-2">
      </a>
    </div>
  </div>

  <p class="roboto-300 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pl-2 pr-2 pt-2">
        Made with ♥ in Samarinda
  </p>

  <p class="roboto-300 sm:text-lg md:text-lg lg:text-xl xl:text-1xl text-center pl-2 pr-2">
        2021 - <?= date("Y") ?>
  </p>

</body>
</html>