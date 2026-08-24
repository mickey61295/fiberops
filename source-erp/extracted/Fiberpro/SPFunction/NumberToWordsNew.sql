/*  
;=============================================  
; Author            :  Global Software's  
; Create date       :  16/08/2022  
; Create By         :  SHAJAHAN
; Description       : NumberToWordsNew
; Change Person     :  SHAJAHAN  
; Last Change Date  :  26-AUG-2022 09.03
; =============================================   */

Create FUNCTION  [dbo].[NumberToWordsNew] (@intNumberValue INTEGER)  
RETURNS VARCHAR(2000)
AS  
BEGIN 
  DECLARE @strNumberString VARCHAR(9)
  DECLARE @strReturn VARCHAR(2000)
  DECLARE @intUnits SMALLINT

  -- Create table of number groups  
  DECLARE @tblNumberGroups TABLE (Units SMALLINT, Hundreds SMALLINT, Tens SMALLINT)

   -- Handle errors and 'quick wins' 
  IF @intNumberValue IS NULL RETURN NULL
  IF ISNUMERIC(@intNumberValue)=0 RETURN NULL
  IF @intNumberValue = 0 RETURN 'ZERO'  

  IF @intNumberValue < 0
  BEGIN
    SET @strReturn='MINUS '
    SET @intNumberValue=ABS(@intNumberValue)
  END

  SET @intUnits =0

  -- Populate table of number groups  
  WHILE (@intNumberValue % 1000) > 0 OR  (@intNumberValue/1000) >0
  BEGIN
    INSERT INTO @tblNumberGroups (Units, Hundreds, Tens) VALUES (@intUnits, (@intNumberValue % 1000)/100, (@intNumberValue % 1000) % 100 )
    SELECT @intNumberValue = CAST (@intNumberValue / 1000 AS INTEGER)
    SET @intUnits = @intUnits + 1
  END

  -- Remove last unit added
  SET @intUnits = @intUnits-1  

  -- Concatenate text number by reading number groups in reverse order
  SELECT @strReturn = ISNULL(@strReturn,' ') +
  ISNULL(
  ISNULL((CASE Hundreds
    WHEN 1 THEN 'ONE HUNDRED '
    WHEN 2 THEN 'TWO HUNDRED '
    WHEN 3 THEN 'THREE HUNDRED '
    WHEN 4 THEN 'FOUR HUNDRED '
    WHEN 5 THEN 'FIVE HUNDRED '
    WHEN 6 THEN 'SIX HUNDRED '
    WHEN 7 THEN 'SEVEN HUNDRED '
    WHEN 8 THEN 'EIGHT HUNDRED '
    WHEN 9 THEN 'NINE HUNDRED '
  END),' ') + 
  CASE WHEN (Hundreds >0 OR Units<@intUnits) AND Tens > 0   THEN ' AND ' ELSE ' ' END +
  ISNULL((CASE Tens / 10
    WHEN 2 THEN 'TWENTY '
    WHEN 3 THEN 'THIRTY '
    WHEN 4 THEN 'FORTY '
    WHEN 5 THEN 'FIFTY '
    WHEN 6 THEN 'SIXTY '
    WHEN 7 THEN 'SEVENTY '
    WHEN 8 THEN 'EIGHTY '
    WHEN 9 THEN 'NINETY '
  END),' ') +
  ISNULL((CASE Tens
    WHEN 10 THEN 'TEN '
    WHEN 11 THEN 'ELEVEN '
    WHEN 12 THEN 'TWELVE '
    WHEN 13 THEN 'THIRTEEN '
    WHEN 14 THEN 'FOURTEEN '
    WHEN 15 THEN 'FIFTEEN '
    WHEN 16 THEN 'SIXTEEN '
    WHEN 17 THEN 'SEVENTEEN '
    WHEN 18 THEN 'EIGHTEEN '
    WHEN 19 THEN 'NINETEEN '
  END),' ') +
  COALESCE(
    CASE WHEN Tens %10 =1 AND Tens / 10  <> 1 THEN 'ONE ' END,
    CASE WHEN Tens %10 =2 AND Tens / 10  <> 1 THEN 'TWO ' END,
  CASE WHEN Tens %10 =3 AND Tens / 10  <> 1 THEN 'THREE ' END,
  CASE WHEN Tens %10 =4 AND Tens / 10  <> 1 THEN 'FOUR ' END,
    CASE WHEN Tens %10 =5 AND Tens / 10  <> 1 THEN 'FIVE ' END,
    CASE WHEN Tens %10 =6 AND Tens / 10  <> 1 THEN 'SIX ' END,
    CASE WHEN Tens %10 =7 AND Tens / 10  <> 1 THEN 'SEVEN ' END,
    CASE WHEN Tens %10 =8 AND Tens / 10  <> 1 THEN 'EIGHT ' END,
    CASE WHEN Tens %10 =9 AND Tens / 10  <> 1 THEN 'NINE ' END,
  ' ')+
  COALESCE(
   CASE WHEN Units=1 AND (Hundreds>0 OR Tens>0) THEN 'THOUSAND ' END,
    CASE WHEN Units=2 AND (Hundreds>0 OR Tens>0) THEN 'MILLION ' END,
   CASE WHEN Units=3 AND (Hundreds>0 OR Tens>0) THEN 'BILLION ' END,
   CASE WHEN Units=4 AND (Hundreds>0 OR Tens>0) THEN 'TRILLION ' END,
  ' ')
   ,' ')
  FROM @tblNumberGroups
  ORDER BY units DESC

  -- Get rid of all the spaces 
  WHILE CHARINDEX('  ', @strReturn)>0
   BEGIN
      SET @strReturn = REPLACE(@strReturn,'  ',' ')
   END

  SET @strReturn = LTRIM(RTRIM(@strReturn))

  RETURN @strReturn
END


