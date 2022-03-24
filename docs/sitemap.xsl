<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="2.0" xmlns:html="http://www.w3.org/TR/REC-html40" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
		<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
				<title>XML Sitemap</title>
				<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
				<style type="text/css">
					body {
						font-size: 14px;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
						margin: 0;
						color: #545353;
					}
					a {
						color: #735F91;
						text-decoration: none;
					}
					#description {
						background-color: #735F91;
						padding: 20px 40px;
						color: #FFF;
					}
					#description h1 {
						color: inherit;
						margin: 0;
						font-size: 2em;
						font-weight: normal;
					}
					#description h2 {
						color: inherit;
						margin: 0;
						font-size: 0.8em;
						font-weight: normal;
					}
					#description a {
						color: inherit;
					}
					#content {
						padding: 20px 40px;
						background: #FFF;
					}
					.table {
						width:100%;
						margin-bottom:1rem;
						color:#212529;
					}
					.table td,.table th {
						padding: 5px;
						vertical-align: top;
						border-top: 1px solid #dee2e6;
					}
					.table thead th {
						vertical-align: bottom;
						border-bottom:2px solid #dee2e6;
					}
					.table tbody+tbody{
						border-top:2px solid #dee2e6;
					}
					.table-sm td,.table-sm th{
						padding: 5px;
					}
					.table-bordered{
						border:1px solid #dee2e6;
					}
					.table-bordered td,.table-bordered th{
						border:1px solid #dee2e6
					}.table-bordered thead td,.table-bordered thead th{
						border-bottom-width:2px
					}.table-borderless tbody+tbody,.table-borderless td,.table-borderless th,.table-borderless thead th{border:0}.table-striped tbody tr:nth-of-type(odd){background-color:rgba(0,0,0,.05)}.table-hover tbody tr:hover{color:#212529;background-color:rgba(0,0,0,.075)}.table-primary,.table-primary>td,.table-primary>th{background-color:#b8daff}.table-primary tbody+tbody,.table-primary td,.table-primary th,.table-primary thead th{border-color:#7abaff}.table-hover .table-primary:hover{background-color:#9fcdff}.table-hover .table-primary:hover>td,.table-hover .table-primary:hover>th{background-color:#9fcdff}.table-secondary,.table-secondary>td,.table-secondary>th{background-color:#d6d8db}.table-secondary tbody+tbody,.table-secondary td,.table-secondary th,.table-secondary thead th{border-color:#b3b7bb}.table-hover .table-secondary:hover{background-color:#c8cbcf}.table-hover .table-secondary:hover>td,.table-hover .table-secondary:hover>th{background-color:#c8cbcf}.table-success,.table-success>td,.table-success>th{background-color:#c3e6cb}.table-success tbody+tbody,.table-success td,.table-success th,.table-success thead th{border-color:#8fd19e}.table-hover .table-success:hover{background-color:#b1dfbb}.table-hover .table-success:hover>td,.table-hover .table-success:hover>th{background-color:#b1dfbb}.table-info,.table-info>td,.table-info>th{background-color:#bee5eb}.table-info tbody+tbody,.table-info td,.table-info th,.table-info thead th{border-color:#86cfda}.table-hover .table-info:hover{background-color:#abdde5}.table-hover .table-info:hover>td,.table-hover .table-info:hover>th{background-color:#abdde5}.table-warning,.table-warning>td,.table-warning>th{background-color:#ffeeba}.table-warning tbody+tbody,.table-warning td,.table-warning th,.table-warning thead th{border-color:#ffdf7e}.table-hover .table-warning:hover{background-color:#ffe8a1}.table-hover .table-warning:hover>td,.table-hover .table-warning:hover>th{background-color:#ffe8a1}.table-danger,.table-danger>td,.table-danger>th{background-color:#f5c6cb}.table-danger tbody+tbody,.table-danger td,.table-danger th,.table-danger thead th{border-color:#ed969e}.table-hover .table-danger:hover{background-color:#f1b0b7}.table-hover .table-danger:hover>td,.table-hover .table-danger:hover>th{background-color:#f1b0b7}.table-light,.table-light>td,.table-light>th{background-color:#fdfdfe}.table-light tbody+tbody,.table-light td,.table-light th,.table-light thead th{border-color:#fbfcfc}.table-hover .table-light:hover{background-color:#ececf6}.table-hover .table-light:hover>td,.table-hover .table-light:hover>th{background-color:#ececf6}.table-dark,.table-dark>td,.table-dark>th{background-color:#c6c8ca}.table-dark tbody+tbody,.table-dark td,.table-dark th,.table-dark thead th{border-color:#95999c}.table-hover .table-dark:hover{background-color:#b9bbbe}.table-hover .table-dark:hover>td,.table-hover .table-dark:hover>th{background-color:#b9bbbe}.table-active,.table-active>td,.table-active>th{background-color:rgba(0,0,0,.075)}.table-hover .table-active:hover{background-color:rgba(0,0,0,.075)}.table-hover .table-active:hover>td,.table-hover .table-active:hover>th{background-color:rgba(0,0,0,.075)}.table .thead-dark th{color:#fff;background-color:#343a40;border-color:#454d55}.table .thead-light th{color:#495057;background-color:#e9ecef;border-color:#dee2e6}.table-dark{color:#fff;background-color:#343a40}.table-dark td,.table-dark th,.table-dark thead th{border-color:#454d55}.table-dark.table-bordered{border:0}.table-dark.table-striped tbody tr:nth-of-type(odd){background-color:rgba(255,255,255,.05)}.table-dark.table-hover tbody tr:hover{color:#fff;background-color:rgba(255,255,255,.075)}@media (max-width:575.98px){.table-responsive-sm{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table-responsive-sm>.table-bordered{border:0}}@media (max-width:767.98px){.table-responsive-md{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table-responsive-md>.table-bordered{border:0}}@media (max-width:991.98px){.table-responsive-lg{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table-responsive-lg>.table-bordered{border:0}}@media (max-width:1199.98px){.table-responsive-xl{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table-responsive-xl>.table-bordered{border:0}}.table-responsive{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table-responsive>.table-bordered{border:0}
					
					
					@media only screen and (max-width: 800px) {
    
				    /* Force table to not be like tables anymore */
					#content table, 
					#content thead, 
					#content tbody, 
					#content th, 
					#content td, 
					#content tr { 
						display: block; 
					}
				 
					/* Hide table headers (but not display: none;, for accessibility) */
					#content thead tr { 
						position: absolute;
						top: -9999px;
						left: -9999px;
					}
				 
					#content tr { border: 1px solid #ccc; }
				 
					#content td { 
						/* Behave  like a "row" */
						border: none;
						border-bottom: 1px solid #eee; 
						position: relative;
						padding-left: 50%; 
						white-space: normal;
						text-align:left;
						<!-- width: 100%!important; -->
					}
				 
					#content td:before { 
						/* Now like a table header */
						position: absolute;
						/* Top/left values mimic padding */
						top: 6px;
						left: 6px;
						width: 45%; 
						padding-right: 10px; 
						white-space: nowrap;
						text-align:left;
						font-weight: bold;
					}
				 
					/*
					Label the data
					*/
					#content td:before { content: attr(data-title); }
				}
			</style>
			</head>
			<body>

				<div id="description">

					<h1>XML Sitemap</h1>
					<h2><a href="https://codeermeneer.nl/portfolio/plugin/companion-sitemap-generator/">By Companion Sitemap Generator</a></h2>

				</div>

				<div id="content">
					
					<p class="urlcount">
						This XML Sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.								
					</p>
									
					<table id="sitemap" class="table table-bordered table-hover table-responsive table-striped">

						<thead class="thead-dark">
							<tr>
								<th style="width: 54px;">No.</th>
								<th>URL</th>
								<th colspan="5">Translations</th>
							</tr>
						</thead>

						<tbody>
							<xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyz'"/>
							<xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
							<xsl:for-each select="sitemap:urlset/sitemap:url">
								<xsl:variable name="TestURL">
									<xsl:value-of select="sitemap:loc"/>
								</xsl:variable>
									<tr>
										<td data-title="No.">
											<xsl:value-of select="position()"/>
										</td>
										<td data-title="URL" style="word-wrap: break-word;">
											<xsl:variable name="itemURL">
												<xsl:value-of select="sitemap:loc"/>
											</xsl:variable>
											<a href="{$itemURL}" target="_blank" rel="noopener noreferrer">
												<xsl:value-of select="sitemap:loc"/>
											</a>
										</td>
										<td>
											<xsl:for-each select="./*[@rel='alternate']">
												<xsl:variable name="itemAltURL">
													<xsl:value-of select="@href"/>
												</xsl:variable>
												<a href="{$itemAltURL}" target="_blank" rel="noopener noreferrer">
													<xsl:value-of select="@href"/>
												</a>
											</xsl:for-each>
										</td>
									</tr>
							</xsl:for-each>
						</tbody>
					</table>
						
				</div>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>