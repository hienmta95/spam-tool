<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('index');
});

Route::get('/share-location', function () {
    return view('share-location');
});

Route::get('/share-location-dev', function () {
    return view('share-location-dev');
});

Route::get('/share-location-api', function () {
    return view('share-location-api');
});
